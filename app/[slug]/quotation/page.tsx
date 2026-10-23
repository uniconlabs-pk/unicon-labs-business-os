'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import CateringQuotation from '@/app/components/CateringQuotation'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function TenantCateringQuotationPage({ params }: PageProps) {
  const { slug } = use(params)
  const router = useRouter()

  const [business, setBusiness] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Quotations List & Builder States
  const [quotations, setQuotations] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null)
  const [selectedQuotation, setSelectedQuotation] = useState<any | null>(null)

  // Form Fields for New Quotation
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [eventType, setEventType] = useState('Baraat')
  const [venueName, setVenueName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [guestCount, setGuestCount] = useState<number>(300)
  
  // Line Items List
  const [items, setItems] = useState<any[]>([])

  // Additional Charges & Notes
  const [serviceCharges, setServiceCharges] = useState<number>(10000)
  const [transportCharges, setTransportCharges] = useState<number>(5000)
  const [taxPercent, setTaxPercent] = useState<number>(0)
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [termsNotes, setTermsNotes] = useState(
    '1. 50% advance payment required upon order confirmation.\n2. Balance payment due on or before event day.\n3. All prices are only valid for 7 days from the date of quotation issued.'
  )
  const [submitting, setSubmitting] = useState(false)

  // Security Check & Data Fetching on Load
  useEffect(() => {
    const rawSession = localStorage.getItem(`tenant_session_${slug}`)
    if (!rawSession) {
      router.push(`/${slug}/login`)
      return
    }

    async function verifyAndLoad() {
      const { data: biz, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .single()

      if (error || !biz) {
        router.push('/')
        return
      }

      setBusiness(biz)

      if (biz.has_catering_quotation !== true) {
        setLoading(false)
        return
      }

      const [{ data: quotes }, { data: prodData }] = await Promise.all([
        supabase.from('catering_quotations').select('*').eq('business_id', biz.id).order('created_at', { ascending: false }),
        supabase.from('products').select('*').eq('business_id', biz.id).order('sort_order', { ascending: true })
      ])

      if (quotes) setQuotations(quotes)
      if (prodData) setProducts(prodData)

      setLoading(false)
    }

    verifyAndLoad()
  }, [slug, router])

  const handleAddItem = () => {
    setItems([...items, { category: 'Main Course', name: '', paxQty: guestCount, unitPrice: 0 }])
  }

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const updated = [...items]
    updated[index][field] = value

    // If product selection changed via inventory dropdown
    if (field === 'productId') {
      const selectedProd = products.find(p => p.id === value)
      if (selectedProd) {
        updated[index].name = selectedProd.name
        // Automatically pull catering bulk price if available, otherwise fallback to retail price
        const bulkPrice = selectedProd.catering_price !== null && selectedProd.catering_price !== undefined 
          ? selectedProd.catering_price 
          : selectedProd.price
        updated[index].unitPrice = bulkPrice || 0
      }
    }

    setItems(updated)
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleEditClick = (q: any) => {
    setEditingQuotationId(q.id)
    setClientName(q.client_name || '')
    setClientPhone(q.client_phone || '')
    setClientEmail(q.client_email || '')
    setEventType(q.event_type || 'Baraat')
    setVenueName(q.venue_name || '')
    setEventDate(q.event_date || '')
    setEventTime(q.event_time || '')
    setVenueAddress(q.venue_address || '')
    setGuestCount(q.guest_count || 300)
    setItems(q.items_json || [])
    setServiceCharges(q.service_charges ?? 10000)
    setTransportCharges(q.transport_charges ?? 5000)
    setTaxPercent(q.tax_percent ?? 0)
    setDiscountAmount(q.discount_amount ?? 0)
    setTermsNotes(q.terms_notes || '1. 50% advance payment required upon order confirmation.\n2. Balance payment due on or before event day.\n3. All prices are only valid for 7 days from the date of quotation issued.')
    setIsCreating(true)
  }

  const resetFormFields = () => {
    setEditingQuotationId(null)
    setClientName('')
    setClientPhone('')
    setClientEmail('')
    setEventType('Baraat')
    setVenueName('')
    setEventDate('')
    setEventTime('')
    setVenueAddress('')
    setGuestCount(300)
    setItems([])
    setServiceCharges(10000)
    setTransportCharges(5000)
    setTaxPercent(0)
    setDiscountAmount(0)
  }

  const itemsSubtotal = items.reduce((sum, item) => sum + ((parseFloat(item.paxQty) || 0) * (parseFloat(item.unitPrice) || 0)), 0)
  const calculatedTax = (itemsSubtotal * (parseFloat(String(taxPercent)) || 0)) / 100
  const grandTotal = itemsSubtotal + (parseFloat(String(serviceCharges)) || 0) + (parseFloat(String(transportCharges)) || 0) + calculatedTax - (parseFloat(String(discountAmount)) || 0)

  const handleSaveQuotation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientName || !eventDate || !venueAddress || !venueName || items.length === 0) {
      alert('Please fill in all mandatory quotation fields.')
      return
    }

    setSubmitting(true)

    const payload = {
      client_name: clientName.trim(),
      client_phone: clientPhone.trim(),
      client_email: clientEmail.trim(),
      event_type: eventType.trim(),
      venue_name: venueName.trim(),
      event_date: eventDate,
      event_time: eventTime,
      venue_address: venueAddress.trim(),
      guest_count: parseInt(String(guestCount)) || 300,
      items_json: items,
      service_charges: serviceCharges,
      transport_charges: transportCharges,
      tax_amount: calculatedTax,
      tax_percent: taxPercent,
      discount_amount: discountAmount,
      total_amount: grandTotal,
      terms_notes: termsNotes
    }

    if (editingQuotationId) {
      const { data, error } = await supabase
        .from('catering_quotations')
        .update(payload)
        .eq('id', editingQuotationId)
        .select()

      if (error) {
        alert(`Failed to update quotation: ${error.message}`)
      } else {
        alert('Quotation successfully updated!')
        if (data && data[0]) {
          setQuotations(quotations.map(q => q.id === editingQuotationId ? data[0] : q))
          setSelectedQuotation(data[0])
        }
        setIsCreating(false)
        setEditingQuotationId(null)
      }
    } else {
      const quotPrefix = (business?.quotation_prefix || 'QTN').trim().toUpperCase()
      const currentQuotSeq = business?.next_quotation_seq ?? 100000
      const quotationNo = `${quotPrefix}/${currentQuotSeq}`

      const insertPayload = {
        ...payload,
        business_id: business.id,
        tenant_slug: slug,
        quotation_no: quotationNo,
        status: 'Draft'
      }

      const { data, error } = await supabase
        .from('catering_quotations')
        .insert([insertPayload])
        .select()

      if (!error) {
        await supabase
          .from('businesses')
          .update({ next_quotation_seq: currentQuotSeq + 1 })
          .eq('id', business.id)

        setBusiness({ ...business, next_quotation_seq: currentQuotSeq + 1 })
      }

      if (error) {
        alert(`Failed to save quotation: ${error.message}`)
      } else {
        alert(`Quotation ${quotationNo} successfully created!`)
        if (data && data[0]) {
          setQuotations([data[0], ...quotations])
          setSelectedQuotation(data[0])
        }
        setIsCreating(false)
      }
    }
    setSubmitting(false)
  }

  const handleShareWhatsApp = (q: any) => {
    const text = `*${business?.name || 'Catering'} - OFFICIAL QUOTATION*\n` +
      `Quotation #: ${q.quotation_no}\n` +
      `Client: ${q.client_name}\n` +
      `Event: ${q.event_type || 'Event'} on ${q.event_date} (${q.guest_count} Pax)\n` +
      `Venue: ${q.venue_name || 'Venue'} - ${q.venue_address}\n` +
      `----------------------------------\n` +
      `*Grand Total: ${business?.currency_symbol || 'Rs.'} ${Number(q.total_amount).toLocaleString()}*\n` +
      `----------------------------------\n` +
      `Please review terms. Thank you for your business!`
    
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const handlePrintPdf = (q: any) => {
    const originalTitle = document.title
    const safeQuotNo = q.quotation_no.replace(/\//g, '-')
    document.title = safeQuotNo
    
    window.print()
    
    setTimeout(() => {
      document.title = originalTitle
    }, 1000)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-mono text-sm">Verifying Session & Module Privileges...</div>
  }

  if (business && business.has_catering_quotation !== true) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-2xl mx-auto flex items-center justify-center text-3xl">🔒</div>
          <h1 className="text-base font-black uppercase tracking-wider text-amber-400">Module Not Enabled</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            The Catering Quotation module is currently disabled for <span className="text-white font-bold">{business.name}</span>.
          </p>
          <button onClick={() => router.push(`/${slug}`)} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition">
            ← Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans select-none">
      
      <header className="bg-slate-900 text-white border-b border-slate-800 px-8 py-4 flex justify-between items-center shrink-0 print:hidden">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center font-black">🍽️</div>
          <div>
            <h1 className="text-xs font-black uppercase tracking-wider">Catering & Bulk Quotation Hub</h1>
            <p className="text-[10px] text-slate-400">{business?.name} ({slug})</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={() => router.push(`/${slug}`)} className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer">
            ← Back to Dashboard
          </button>
          <button onClick={() => { resetFormFields(); setIsCreating(true); }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow cursor-pointer">
            + New Quotation
          </button>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6 print:p-0 print:m-0 print:max-w-none print:w-full print:block">
        
        {!isCreating && !selectedQuotation && (
          <div className="space-y-4 print:hidden">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex justify-between items-center">
              <div>
                <h2 className="text-sm font-black uppercase text-slate-900">Generated Quotations Archive</h2>
                <p className="text-xs text-slate-500">Manage, print, and share catering quotations for bulk orders.</p>
              </div>
              <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-xl">Total: {quotations.length}</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3.5">Quotation #</th>
                    <th className="p-3.5">Client Details</th>
                    <th className="p-3.5">Event & Venue</th>
                    <th className="p-3.5">Pax (Guests)</th>
                    <th className="p-3.5">Grand Total</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quotations.length > 0 ? (
                    quotations.map(q => (
                      <tr key={q.id} className="hover:bg-slate-50 transition">
                        <td className="p-3.5 font-mono font-black text-indigo-700">{q.quotation_no}</td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{q.client_name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{q.client_phone}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800">{q.event_type || 'Event'} ({q.event_date})</div>
                          <div className="text-[10px] text-slate-500 truncate max-w-xs">{q.venue_name ? `${q.venue_name} - ` : ''}{q.venue_address}</div>
                        </td>
                        <td className="p-3.5 font-mono font-bold">{q.guest_count} Pax</td>
                        <td className="p-3.5 font-mono font-black text-emerald-700 text-sm">
                          {business?.currency_symbol || 'Rs.'} {Number(q.total_amount).toLocaleString()}
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          <button onClick={() => setSelectedQuotation(q)} className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg font-bold text-[10px] transition cursor-pointer">
                            View / Print A4 🖨️
                          </button>
                          <button onClick={() => handleEditClick(q)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-[10px] transition cursor-pointer">
                            Edit ✏️
                          </button>
                          <button onClick={() => handleShareWhatsApp(q)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px] transition cursor-pointer">
                            WhatsApp 💬
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-slate-400 font-medium">
                        No catering quotations generated yet. Click <span className="text-emerald-600 font-bold">"+ New Quotation"</span> above to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {isCreating && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 max-w-4xl mx-auto print:hidden">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-black uppercase text-slate-900">
                  {editingQuotationId ? 'Edit Existing Catering Quotation' : 'Create New Catering Quotation'}
                </h2>
                <p className="text-xs text-slate-500">Fill in event details, guest count, and menu breakdown.</p>
              </div>
              <button onClick={() => { setIsCreating(false); setEditingQuotationId(null); }} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 font-bold flex items-center justify-center text-xs transition cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveQuotation} className="space-y-6 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-600 font-bold uppercase text-[10px] mb-1">Client Full Name *</label>
                  <input type="text" required placeholder="Client / Company Name" value={clientName} onChange={e => setClientName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold" />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase text-[10px] mb-1">Client Phone / WhatsApp *</label>
                  <input type="text" required placeholder="+92 300 ..." value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono" />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase text-[10px] mb-1">Client Email</label>
                  <input type="email" placeholder="client@domain.com" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-slate-600 font-bold uppercase text-[10px] mb-1">Event Type / Name *</label>
                  <input type="text" required placeholder="e.g. Baraat / Walima" value={eventType} onChange={e => setEventType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold" />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase text-[10px] mb-1">Event Date *</label>
                  <input type="date" required value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono" />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase text-[10px] mb-1">Event Time</label>
                  <input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono font-medium" />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase text-[10px] mb-1">Estimated Guest Count (Pax) *</label>
                  <input type="number" min={1} required value={guestCount} onChange={e => { setGuestCount(parseInt(e.target.value) || 0); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono font-bold text-indigo-700" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 font-bold uppercase text-[10px] mb-1">Venue Name *</label>
                  <input type="text" required placeholder="e.g. Hill Top Lawn" value={venueName} onChange={e => setVenueName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold" />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase text-[10px] mb-1">Venue Address *</label>
                  <input type="text" required placeholder="Complete Hall / Farmhouse Address" value={venueAddress} onChange={e => setVenueAddress(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium" />
                </div>
              </div>

              {/* Line Items Builder */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-black text-slate-900 uppercase tracking-wide">Menu Items & Package Breakdown</h3>
                  <button type="button" onClick={handleAddItem} className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl text-[10px] font-bold transition cursor-pointer">+ Add Menu Item</button>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-50 p-3 rounded-2xl border border-slate-200">
                      <div className="sm:col-span-3">
                        <select value={item.category} onChange={e => handleUpdateItem(idx, 'category', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 font-bold text-xs uppercase">
                          <option value="Appetizers">Appetizers / Soup</option>
                          <option value="Main Course">Main Course</option>
                          <option value="BBQ / Grill">BBQ / Grill</option>
                          <option value="Tandoor / Breads">Tandoor / Breads</option>
                          <option value="Salat / Raita">Salat / Raita</option>
                          <option value="Desserts">Desserts / Sweets</option>
                          <option value="Beverages">Beverages / Drinks</option>
                        </select>
                      </div>
                      <div className="sm:col-span-5">
                        {/* DYNAMIC INVENTORY PRODUCT DROPDOWN */}
                        <select 
                          value={item.productId || ''} 
                          onChange={e => handleUpdateItem(idx, 'productId', e.target.value)} 
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-xs text-indigo-900"
                          required
                        >
                          <option value="">Select Item from Inventory Catalog</option>
                          {products
  .filter(p => p.show_in_catering === true)
  .map(p => (
    <option key={p.id} value={p.id}>
      {p.name} ({business?.currency_symbol || 'Rs.'} {p.catering_price !== null && p.catering_price !== undefined ? p.catering_price : p.price})
    </option>
  ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <input type="number" min={1} placeholder="Pax / Qty" value={item.paxQty} onChange={e => handleUpdateItem(idx, 'paxQty', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono" required />
                      </div>
                      <div className="sm:col-span-1">
                        <input type="number" min={0} placeholder="Price" value={item.unitPrice} onChange={e => handleUpdateItem(idx, 'unitPrice', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-emerald-700" required />
                      </div>
                      <div className="sm:col-span-1 text-center">
                        {items.length > 1 && (
                          <button type="button" onClick={() => handleRemoveItem(idx)} className="text-rose-600 hover:text-rose-800 font-bold p-1 cursor-pointer">🗑️</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Adjustments & Totals */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-slate-600 font-bold uppercase text-[10px] mb-1">Service & Setup Charges</label>
                  <input type="number" min={0} value={serviceCharges} onChange={e => setServiceCharges(parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono" />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase text-[10px] mb-1">Transport Charges</label>
                  <input type="number" min={0} value={transportCharges} onChange={e => setTransportCharges(parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono" />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase text-[10px] mb-1">Tax / GST %</label>
                  <input type="number" min={0} max={100} step="0.1" value={taxPercent} onChange={e => setTaxPercent(parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono" placeholder="e.g. 16" />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase text-[10px] mb-1">Special Discount</label>
                  <input type="number" min={0} value={discountAmount} onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-rose-600 font-bold" />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold uppercase text-[10px] mb-1">Terms & Conditions</label>
                <textarea rows={3} value={termsNotes} onChange={e => setTermsNotes(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 resize-none leading-relaxed" />
              </div>

              {/* Grand Total Summary Box */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Calculated Grand Total</span>
                  <div className="text-xl font-black font-mono text-emerald-400">{business?.currency_symbol || 'Rs.'} {grandTotal.toLocaleString()}</div>
                </div>
                <div className="flex space-x-3">
                  <button type="button" onClick={() => { setIsCreating(false); setEditingQuotationId(null); }} className="px-4 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl cursor-pointer">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider rounded-xl shadow cursor-pointer">
                    {submitting ? 'Saving Changes...' : editingQuotationId ? 'Update Quotation ⚡' : 'Save & Generate Quotation ⚡'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {selectedQuotation && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs print:hidden max-w-[210mm] mx-auto">
              <button onClick={() => setSelectedQuotation(null)} className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer">
                ← Back to List
              </button>
              <div className="flex items-center space-x-3">
                <button onClick={() => handleShareWhatsApp(selectedQuotation)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition cursor-pointer">
                  Share via WhatsApp 💬
                </button>
                <button onClick={() => handlePrintPdf(selectedQuotation)} className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-wider rounded-xl text-xs transition shadow cursor-pointer">
                  Print / Save as PDF 🖨️
                </button>
              </div>
            </div>

            <CateringQuotation business={business} quotation={selectedQuotation} />
          </div>
        )}

      </main>
    </div>
  )
}