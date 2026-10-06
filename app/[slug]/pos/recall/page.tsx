'use client'

import { useState, useEffect, use, useMemo, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import ThermalReceipt from '../../../components/ThermalReceipt'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function PosRecallPortal({ params }: PageProps) {
  const { slug } = use(params)
  const router = useRouter()
  const printReceiptRef = useRef<HTMLDivElement>(null)

  const [business, setBusiness] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [loadingRecall, setLoadingRecall] = useState(false)

  // Search Filters
  const [recallSearchOrderNo, setRecallSearchOrderNo] = useState('')
  const [recallSearchSerial, setRecallSearchSerial] = useState('')
  const [recallSearchCustName, setRecallSearchCustName] = useState('')
  const [recallSearchPhone, setRecallSearchPhone] = useState('')
  const [recallDateFrom, setRecallDateFrom] = useState('')
  const [recallDateTo, setRecallDateTo] = useState('')

  // Print State
  const [printOrderData, setPrintOrderData] = useState<any>(null)

  useEffect(() => {
    async function init() {
      // Block direct URL typing (must be loaded inside POS iframe modal)
      if (typeof window !== 'undefined' && window.self === window.top) {
        router.push(`/${slug}/pos`)
        return
      }

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
      document.title = `Recall & Search - ${biz.name}`

      // Load orders
      setLoadingRecall(true)
      const { data: ords } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', biz.id)
        .order('created_at', { ascending: false })
        .limit(150)

      if (ords) setRecentOrders(ords)
      setLoadingRecall(false)
      setLoading(false)
    }
    init()
  }, [slug, router])

  const filteredRecallOrders = useMemo(() => {
    return recentOrders.filter(ord => {
      if (recallDateFrom) {
        const orderDate = new Date(ord.created_at).toISOString().split('T')[0]
        if (orderDate < recallDateFrom) return false
      }
      if (recallDateTo) {
        const orderDate = new Date(ord.created_at).toISOString().split('T')[0]
        if (orderDate > recallDateTo) return false
      }
      if (recallSearchCustName.trim()) {
        const cName = (ord.customer_name || '').toLowerCase()
        if (!cName.includes(recallSearchCustName.trim().toLowerCase())) return false
      }
      if (recallSearchPhone.trim()) {
        const phone = (ord.customer_phone || '')
        if (!phone.includes(recallSearchPhone.trim())) return false
      }
      if (recallSearchOrderNo.trim()) {
        const idStr = String(ord.order_number || ord.id || '').toLowerCase()
        if (!idStr.includes(recallSearchOrderNo.trim().toLowerCase())) return false
      }
      if (recallSearchSerial.trim()) {
        const serial = (ord.serial_number || '').toLowerCase()
        if (!serial.includes(recallSearchSerial.trim().toLowerCase())) return false
      }
      return true
    })
  }, [recentOrders, recallSearchOrderNo, recallSearchSerial, recallSearchCustName, recallSearchPhone, recallDateFrom, recallDateTo])

  const handleReprintOrder = (orderRecord: any) => {
    let parsedTender: any[] = []
    try {
      if (typeof orderRecord.tender_breakdown === 'string' && orderRecord.tender_breakdown.trim() !== '' && orderRecord.tender_breakdown !== '[]') {
        parsedTender = JSON.parse(orderRecord.tender_breakdown)
      } else if (Array.isArray(orderRecord.tender_breakdown)) {
        parsedTender = orderRecord.tender_breakdown
      }
    } catch (e) {
      parsedTender = []
    }
    const tenderEntry = parsedTender[0] || {}

    const resolvedCashReceived = orderRecord.cash_received !== undefined && orderRecord.cash_received !== null && orderRecord.cash_received !== ''
      ? orderRecord.cash_received 
      : (tenderEntry.receivedCash !== undefined && tenderEntry.receivedCash !== null && tenderEntry.receivedCash !== ''
      ? tenderEntry.receivedCash 
      : (tenderEntry.amount !== undefined && tenderEntry.amount !== null ? tenderEntry.amount : orderRecord.total_amount || 0))

    const resolvedChangeReturned = orderRecord.change_returned !== undefined && orderRecord.change_returned !== null && orderRecord.change_returned !== ''
      ? orderRecord.change_returned
      : (tenderEntry.changeReturned !== undefined && tenderEntry.changeReturned !== null ? tenderEntry.changeReturned : 0)

    const receiptPayload = {
      storeName: business?.name || 'STORE',
      address: business?.address || '',
      phone: business?.phone || '',
      orderNo: orderRecord.order_number ? `KB-${String(orderRecord.order_number).padStart(6, '0')}` : (orderRecord.serial_number || orderRecord.id?.slice(0, 8) || 'SAVED'),
      serial_number: orderRecord.serial_number || `SN-${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date(orderRecord.created_at || Date.now()).toLocaleString(),
      staff: orderRecord.cashier_name || 'Staff',
      waiter: orderRecord.waiter_name || null,
      customerName: orderRecord.customer_name || 'Walk-In Customer',
      customerPhone: orderRecord.customer_phone || '',
      deliveryAddress: orderRecord.delivery_address || '',
      deliveryNote: orderRecord.delivery_note || '',
      serviceType: orderRecord.service_type || 'COUNTER',
      items: orderRecord.items || [],
      subtotal: orderRecord.subtotal || orderRecord.total_amount,
      serviceCharges: orderRecord.service_charges !== undefined ? orderRecord.service_charges : 0,
      discountAmount: orderRecord.discount_amount !== undefined ? orderRecord.discount_amount : (orderRecord.discount || 0),
      deliveryCharges: orderRecord.delivery_charges || 0,
      calculatedTax: orderRecord.gst_amount || 0,
      tax_rate: orderRecord.tax_rate || 15,
      tax_label: orderRecord.tax_label || 'GST',
      tax_term: orderRecord.tax_term || 'EXCLUSIVE',
      grandTotal: orderRecord.total_amount || 0,
      primaryPaymentMethod: orderRecord.payment_method || 'CASH',
      cash_received: resolvedCashReceived,
      change_returned: resolvedChangeReturned,
      fbrPosId: orderRecord.fbr_pos_id || null
    }

    setPrintOrderData(receiptPayload)
    setTimeout(() => {
      if (printReceiptRef.current) {
        window.print()
      }
    }, 150)
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center font-bold">Loading Recall Portal...</div>
  }

  const currencySymbol = business?.currency_symbol || 'Rs.'

  return (
    <div className="min-h-screen flex flex-col font-sans select-none bg-slate-950 text-slate-100 text-xs">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center shrink-0 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center font-bold text-base">📜</div>
          <div>
            <h1 className="text-sm font-black uppercase text-white">Invoice Recall & Search Portal</h1>
            <p className="text-[10px] text-gray-400">Tenant: {business?.name} ({slug})</p>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 space-y-3 shrink-0">
        <div className="flex justify-between items-center text-xs font-bold uppercase text-slate-300">
          <span>🔍 Search & Filter Invoices</span>
          {(recallSearchOrderNo || recallSearchSerial || recallSearchCustName || recallSearchPhone || recallDateFrom || recallDateTo) && (
            <button
              onClick={() => {
                setRecallSearchOrderNo('')
                setRecallSearchSerial('')
                setRecallSearchCustName('')
                setRecallSearchPhone('')
                setRecallDateFrom('')
                setRecallDateTo('')
              }}
              className="text-rose-400 hover:underline text-[10px] cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="space-y-2">
          {/* First Line: Customer Name / Date From / Date To */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Customer Name</label>
              <input type="text" placeholder="Search by name..." value={recallSearchCustName} onChange={e => setRecallSearchCustName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Date From</label>
              <input type="date" value={recallDateFrom} onChange={e => setRecallDateFrom(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 font-mono text-xs text-white" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Date To</label>
              <input type="date" value={recallDateTo} onChange={e => setRecallDateTo(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 font-mono text-xs text-white" />
            </div>
          </div>

          {/* Second Line: Serial Number / Order Number / Mobile Number */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Serial Number</label>
              <input type="text" placeholder="Enter serial no." value={recallSearchSerial} onChange={e => setRecallSearchSerial(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-white" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Order Number</label>
              <input type="text" placeholder="Enter order no." value={recallSearchOrderNo} onChange={e => setRecallSearchOrderNo(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-white" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Mobile Number</label>
              <input type="text" placeholder="Search by phone..." value={recallSearchPhone} onChange={e => setRecallSearchPhone(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <main className="flex-1 p-6 overflow-y-auto space-y-3">
        {loadingRecall ? (
          <div className="text-center py-20 text-slate-400 font-bold">Querying order archives...</div>
        ) : filteredRecallOrders.length > 0 ? (
          <div className="space-y-2 max-w-5xl mx-auto">
            {filteredRecallOrders.map(ord => (
              <div key={ord.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-2xs hover:border-slate-700 transition">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-black text-white text-xs">
                      {ord.order_number ? `KB-${String(ord.order_number).padStart(6, '0')}` : (ord.serial_number || 'SAVED')}
                    </span>
                    <span className="bg-slate-800 text-slate-300 text-[9px] font-bold px-2 py-0.5 rounded uppercase">{ord.service_type || 'COUNTER'}</span>
                    {ord.fiscal_status && (
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                        ord.fiscal_status.includes('refund') ? 'bg-red-950 text-red-300 border border-red-900' : 'bg-emerald-950 text-emerald-300 border border-emerald-900'
                      }`}>
                        {ord.fiscal_status}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Customer: <span className="text-white font-bold">{ord.customer_name || 'Walk-In'}</span> ({ord.customer_phone || 'No Phone'}) • {new Date(ord.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right font-mono">
                    <div className="text-sm font-black text-emerald-400">{currencySymbol} {ord.total_amount}</div>
                    <div className="text-[10px] text-slate-400 uppercase">{ord.payment_method || 'CASH'}</div>
                  </div>
                  <button
                    onClick={() => handleReprintOrder(ord)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-2xs transition flex items-center space-x-1 cursor-pointer"
                  >
                    <span>🖨️</span>
                    <span>Reprint Receipt</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-slate-500 text-xs">No invoices found matching your search criteria.</div>
        )}
      </main>

      {/* Hidden Print Staging */}
      <div className="hidden print:block print:w-[80mm] print:m-0 print:p-0">
        {printOrderData && (
          <div ref={printReceiptRef} className="print-receipt-wrapper">
            <ThermalReceipt
              business={{
                name: business?.name || 'STORE',
                address: business?.address || '',
                phone: business?.phone || '',
                email: business?.email || '',
                strn: business?.manual_strn || business?.strn || '',
                currency_symbol: currencySymbol,
                slug: slug
              }}
              order={{
                id: printOrderData.orderNo,
                serial_number: printOrderData.serial_number,
                created_at: new Date().toISOString(),
                total_amount: printOrderData.grandTotal,
                subtotal: printOrderData.subtotal,
                tax_amount: printOrderData.calculatedTax,
                tax_rate: printOrderData.tax_rate,
                tax_label: printOrderData.tax_label,
                tax_term: printOrderData.tax_term,
                delivery_charges: printOrderData.deliveryCharges,
                discount: printOrderData.discountAmount,
                discount_amount: printOrderData.discountAmount,
                service_charges: printOrderData.serviceCharges,
                payment_breakdown: [{ method: printOrderData.primaryPaymentMethod, amount: printOrderData.grandTotal }],
                order_type: printOrderData.serviceType?.toLowerCase() || 'dine-in',
                cashier_name: printOrderData.staff,
                cash_received: printOrderData.cash_received,
                change_returned: printOrderData.change_returned
              }}
              cart={(printOrderData.items || []).map((i: any) => ({
                name: i.name,
                finalUnitPrice: i.finalUnitPrice || i.price || 0,
                quantity: i.qty || i.quantity || 1,
                selectedModifiers: [
                  ...(i.selectedVariant ? [{ groupName: 'Variant', optionName: i.selectedVariant.name, price: i.selectedVariant.price }] : []),
                  ...(i.dealComponents || []).map((dc: any) => ({ groupName: 'Deal Item', optionName: `${dc.qty}x ${dc.name}`, price: 0 })),
                  ...(i.selectedAddons || []).map((a: any) => ({ groupName: 'Addon', optionName: a.name, price: a.price }))
                ]
              }))}
              customer={{
                name: printOrderData.customerName,
                phone: printOrderData.customerPhone,
                address: printOrderData.deliveryAddress
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}