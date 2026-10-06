'use client'

import { useState, useEffect, use, useMemo, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import ThermalSaleReturn from '../../../components/ThermalSaleReturn'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function PosRefundPortal({ params }: PageProps) {
  const { slug } = use(params)
  const router = useRouter()
  const printSrrRef = useRef<HTMLDivElement>(null)

  const [business, setBusiness] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [orderRefundsMap, setOrderRefundsMap] = useState<{ [orderId: string]: any[] }>({})
  
  // Search Filters
  const [refundSearchOrderNo, setRefundSearchOrderNo] = useState('')
  const [refundSearchSerial, setRefundSearchSerial] = useState('')
  const [refundSearchCustName, setRefundSearchCustName] = useState('')
  const [refundSearchPhone, setRefundSearchPhone] = useState('')
  const [refundDateFrom, setRefundDateFrom] = useState('')
  const [refundDateTo, setRefundDateTo] = useState('')

  // Refund Modal State
  const [selectedOrderForRefund, setSelectedOrderForRefund] = useState<any>(null)
  const [refundManagerPin, setRefundManagerPin] = useState('')
  const [refundManagerQrToken, setRefundManagerQrToken] = useState('')
  const [refundItemsSelection, setRefundItemsSelection] = useState<{ [itemIndex: number]: { returnQty: number, maxQty: number } }>({})
  const [refundReasonCode, setRefundReasonCode] = useState('Quality Issue / Damaged')
  const [processingRefund, setProcessingRefund] = useState(false)
  const [printSrrData, setPrintSrrData] = useState<any>(null)

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
      document.title = `Refund & Returns - ${biz.name}`

      const { data: ords } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', biz.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (ords) {
        setRecentOrders(ords)
        const orderIds = ords.map(o => o.id)
        if (orderIds.length > 0) {
          const { data: allRefunds } = await supabase
            .from('order_refunds')
            .select('original_order_id, returned_items')
            .in('original_order_id', orderIds)

          if (allRefunds) {
            const map: { [id: string]: any[] } = {}
            allRefunds.forEach(ref => {
              if (!map[ref.original_order_id]) map[ref.original_order_id] = []
              if (Array.isArray(ref.returned_items)) {
                map[ref.original_order_id].push(...ref.returned_items)
              }
            })
            setOrderRefundsMap(map)
          }
        }
      }
      setLoading(false)
    }
    init()
  }, [slug, router])

  const filteredRefundOrders = useMemo(() => {
    return recentOrders.filter(ord => {
      if (refundDateFrom) {
        const orderDate = new Date(ord.created_at).toISOString().split('T')[0]
        if (orderDate < refundDateFrom) return false
      }
      if (refundDateTo) {
        const orderDate = new Date(ord.created_at).toISOString().split('T')[0]
        if (orderDate > refundDateTo) return false
      }
      if (refundSearchCustName.trim()) {
        const cName = (ord.customer_name || '').toLowerCase()
        if (!cName.includes(refundSearchCustName.trim().toLowerCase())) return false
      }
      if (refundSearchPhone.trim()) {
        const phone = (ord.customer_phone || '')
        if (!phone.includes(refundSearchPhone.trim())) return false
      }
      if (refundSearchOrderNo.trim()) {
        const idStr = String(ord.order_number || ord.id || '').toLowerCase()
        if (!idStr.includes(refundSearchOrderNo.trim().toLowerCase())) return false
      }
      if (refundSearchSerial.trim()) {
        const serial = (ord.serial_number || '').toLowerCase()
        if (!serial.includes(refundSearchSerial.trim().toLowerCase())) return false
      }
      return true
    })
  }, [recentOrders, refundSearchOrderNo, refundSearchSerial, refundSearchCustName, refundSearchPhone, refundDateFrom, refundDateTo])

  const handleOpenRefundModal = (orderRecord: any) => {
    setSelectedOrderForRefund(orderRecord)
    setRefundManagerPin('')
    setRefundManagerQrToken('')
    setRefundReasonCode('Quality Issue / Damaged')

    const pastReturnedItems = orderRefundsMap[orderRecord.id] || []
    
    const initialSelection: { [idx: number]: { returnQty: number, maxQty: number } } = {}
    if (orderRecord.items && Array.isArray(orderRecord.items)) {
      orderRecord.items.forEach((item: any, idx: number) => {
        const totalQty = item.qty || item.quantity || 1
        let alreadyRefunded = item.refunded_qty || 0
        
        pastReturnedItems.forEach((rItem: any) => {
          const rName = String(rItem.name || '').trim().toLowerCase()
          const iName = String(item.name || '').trim().toLowerCase()
          const rVar = String(rItem.selectedVariant?.name || rItem.variant || 'base').trim().toLowerCase()
          const iVar = String(item.selectedVariant?.name || item.variant || 'base').trim().toLowerCase()

          if ((rName === iName || iName.includes(rName) || rName.includes(iName)) && rVar === iVar) {
            alreadyRefunded += Number(rItem.qty || rItem.quantity || 1)
          }
        })

        alreadyRefunded = Math.min(totalQty, alreadyRefunded)

        const availableMax = Math.max(0, totalQty - alreadyRefunded)
        initialSelection[idx] = { returnQty: 0, maxQty: availableMax }
      })
    }
    setRefundItemsSelection(initialSelection)
  }

  const executeRefundTransaction = async (staffMatch: any) => {
    if (!business?.id || !selectedOrderForRefund || processingRefund) return

    setProcessingRefund(true)
    try {
      let totalRefundAmount = 0
      const returnedItemsList: any[] = []
      const updatedOrderItems = [...(selectedOrderForRefund.items || [])]

      Object.entries(refundItemsSelection).forEach(([idxStr, sel]) => {
        const idx = Number(idxStr)
        if (sel.returnQty > 0) {
          const origItem = updatedOrderItems[idx]
          const itemPrice = origItem.finalUnitPrice || origItem.price || 0
          totalRefundAmount += itemPrice * sel.returnQty

          returnedItemsList.push({
            ...origItem,
            qty: sel.returnQty
          })
        }
      })

      if (totalRefundAmount <= 0) {
        alert('Please select at least one item quantity to refund.')
        setProcessingRefund(false)
        return
      }

      await supabase.from('order_refunds').insert({
        business_id: business.id,
        original_order_id: selectedOrderForRefund.id,
        order_number: selectedOrderForRefund.order_number,
        refund_amount: totalRefundAmount,
        refund_reason: refundReasonCode,
        returned_items: returnedItemsList,
        authorized_by_staff_id: staffMatch.id,
        authorized_by_name: staffMatch.full_name,
        created_at: new Date().toISOString()
      })

      const { data: freshBizForSrr } = await supabase
        .from('businesses')
        .select('next_srr_seq')
        .eq('id', business.id)
        .single()

      const baseSrrSeq = Number(freshBizForSrr?.next_srr_seq ?? 100000)
      const srrNumber = `SRR-${String(baseSrrSeq).padStart(6, '0')}`

      await supabase
        .from('businesses')
        .update({ next_srr_seq: baseSrrSeq + 1 })
        .eq('id', business.id)

      const itemsDescriptionStr = returnedItemsList
        .map((i: any) => `${i.qty || 1}x ${i.name}${i.selectedVariant ? ` [${i.selectedVariant.name}]` : ''}`)
        .join(', ')

      await supabase.from('sales_returns').insert({
        business_id: business.id,
        srr_number: srrNumber,
        order_number: selectedOrderForRefund.order_number ? `KB-${String(selectedOrderForRefund.order_number).padStart(6, '0')}` : 'N/A',
        order_type: (selectedOrderForRefund.service_type || 'COUNTER').toUpperCase(),
        payment_mode: (selectedOrderForRefund.payment_method || 'CASH').toUpperCase(),
        returned_items_description: itemsDescriptionStr,
        return_reason: refundReasonCode,
        amount: totalRefundAmount,
        authorized_by: staffMatch.full_name,
        created_at: new Date().toISOString()
      })

      const srrPayload = {
        storeName: business?.name || 'STORE',
        address: business?.address || '',
        phone: business?.phone || '',
        srrNo: srrNumber,
        originalOrderNo: selectedOrderForRefund.order_number ? `KB-${String(selectedOrderForRefund.order_number).padStart(6, '0')}` : 'N/A',
        serialNumber: selectedOrderForRefund.serial_number || 'N/A',
        date: new Date().toLocaleString(),
        authorizedManager: staffMatch.full_name,
        serviceType: selectedOrderForRefund.service_type || 'COUNTER',
        paymentMode: selectedOrderForRefund.payment_method || 'CASH',
        refundReason: refundReasonCode,
        returnedItems: returnedItemsList,
        totalRefundAmount
      }

      setPrintSrrData(srrPayload)
      setTimeout(() => {
        if (printSrrRef.current) {
          window.print()
        }
      }, 150)

      alert(`Successfully processed refund of ${business?.currency_symbol || 'Rs.'} ${totalRefundAmount} authorized by ${staffMatch.full_name}! Sales Return Receipt printed.`)
      setSelectedOrderForRefund(null)

      // Instantly update local orderRefundsMap so the very first item locks immediately
      setOrderRefundsMap(prevMap => {
        const currentList = prevMap[selectedOrderForRefund.id] || []
        return {
          ...prevMap,
          [selectedOrderForRefund.id]: [...currentList, ...returnedItemsList]
        }
      })

      // Refresh orders
      const { data: ords } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(100)
      if (ords) setRecentOrders(ords)
    } catch (err: any) {
      alert(`Refund error: ${err.message || err}`)
    } finally {
      setProcessingRefund(false)
    }
  }

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!business?.id || !selectedOrderForRefund || processingRefund) return
    
    const pin = refundManagerPin.trim()
    const qr = refundManagerQrToken.trim()

    if (!pin && !qr) {
      alert('Manager Security PIN or QR Badge Scan is mandatory to authorize a refund.')
      return
    }

    let staffMatch = null

    if (pin) {
      const { data } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('business_id', business.id)
        .eq('pin_code', pin)
        .single()
      staffMatch = data
    } else if (qr) {
      const { data } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('business_id', business.id)
        .eq('qr_token', qr)
        .single()
      staffMatch = data
    }

    if (!staffMatch) {
      alert('Invalid Manager PIN or QR Badge. Refund authorization denied.')
      return
    }

    await executeRefundTransaction(staffMatch)
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center font-bold">Loading Refund Portal...</div>
  }

  const currencySymbol = business?.currency_symbol || 'Rs.'

  return (
    <div className="min-h-screen flex flex-col font-sans select-none bg-slate-950 text-slate-100 text-xs">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center shrink-0 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center font-bold text-base">↩️</div>
          <div>
            <h1 className="text-sm font-black uppercase text-white">Refund & Return Authorization Portal</h1>
            <p className="text-[10px] text-gray-400">Tenant: {business?.name} ({slug})</p>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 space-y-3 shrink-0">
        <div className="flex justify-between items-center text-xs font-bold uppercase text-slate-300">
          <span>🔍 Search & Filter Invoices</span>
          {(refundSearchOrderNo || refundSearchSerial || refundSearchCustName || refundSearchPhone || refundDateFrom || refundDateTo) && (
            <button
              onClick={() => {
                setRefundSearchOrderNo('')
                setRefundSearchSerial('')
                setRefundSearchCustName('')
                setRefundSearchPhone('')
                setRefundDateFrom('')
                setRefundDateTo('')
              }}
              className="text-rose-400 hover:underline text-[10px] cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Line 1: Customer Name / Date From / Date To */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Customer Name</label>
            <input type="text" placeholder="Search by name..." value={refundSearchCustName} onChange={e => setRefundSearchCustName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Date From</label>
            <input type="date" value={refundDateFrom} onChange={e => setRefundDateFrom(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 font-mono text-xs text-white" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Date To</label>
            <input type="date" value={refundDateTo} onChange={e => setRefundDateTo(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 font-mono text-xs text-white" />
          </div>
        </div>

        {/* Line 2: Serial Number / Order Number / Mobile Number */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Serial Number</label>
            <input type="text" placeholder="Enter serial no." value={refundSearchSerial} onChange={e => setRefundSearchSerial(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-white" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Order Number</label>
            <input type="text" placeholder="Enter order no." value={refundSearchOrderNo} onChange={e => setRefundSearchOrderNo(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-white" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Mobile Number</label>
            <input type="text" placeholder="Search by phone..." value={refundSearchPhone} onChange={e => setRefundSearchPhone(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-white" />
          </div>
        </div>
      </div>

      <main className="flex-1 p-6 overflow-y-auto space-y-4 max-w-5xl mx-auto w-full">
        <div className="text-xs font-bold text-slate-400 uppercase">Select an invoice to process returns & issue Sales Return Passes (SRR):</div>
        <div className="space-y-2">
          {filteredRefundOrders.length > 0 ? (
            filteredRefundOrders.map((ord: any) => (
              <div key={ord.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-2xs hover:border-slate-700 transition">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-black text-white text-xs">
                      {ord.order_number ? `KB-${String(ord.order_number).padStart(6, '0')}` : 'SAVED'}
                    </span>
                    <span className="bg-slate-800 text-slate-300 text-[9px] font-bold px-2 py-0.5 rounded uppercase">{ord.service_type || 'COUNTER'}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Customer: <span className="text-white font-bold">{ord.customer_name || 'Walk-In'}</span> • {new Date(ord.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right font-mono">
                    <div className="text-sm font-black text-emerald-400">{currencySymbol} {ord.total_amount}</div>
                    <div className="text-[10px] text-slate-400 uppercase">{ord.payment_method || 'CASH'}</div>
                  </div>
                  <button
                    onClick={() => handleOpenRefundModal(ord)}
                    className="px-4 py-2 bg-rose-700 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-2xs transition flex items-center space-x-1 cursor-pointer"
                  >
                    <span>↩️</span>
                    <span>Process Refund</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 text-slate-500 text-xs">No invoices found matching your search criteria.</div>
          )}
        </div>
      </main>

      {/* Refund Modal */}
      {selectedOrderForRefund && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans">
          <form onSubmit={handleProcessRefund} className="bg-slate-900 text-white rounded-3xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-800 text-xs">
            <div className="p-5 bg-rose-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-2">
                <span className="text-base">↩️</span>
                <h3 className="font-black text-sm uppercase tracking-wider">Process Order Refund & Return</h3>
              </div>
              <button type="button" onClick={() => setSelectedOrderForRefund(null)} className="text-rose-200 hover:text-white font-bold cursor-pointer">✕</button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-950">
              <div className="p-3.5 rounded-2xl border bg-slate-900 border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Original Invoice</span>
                  <div className="font-mono font-black text-sm">
                    {selectedOrderForRefund.order_number ? `KB-${String(selectedOrderForRefund.order_number).padStart(6, '0')}` : 'SAVED'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Original Total</span>
                  <div className="font-mono font-black text-emerald-400 text-sm">{currencySymbol} {selectedOrderForRefund.total_amount}</div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-bold uppercase tracking-wide text-[11px]">Select Items & Quantities to Return:</label>
                <div className="border border-slate-800 rounded-2xl p-3 space-y-2 max-h-48 overflow-y-auto bg-slate-900">
                  {selectedOrderForRefund.items && selectedOrderForRefund.items.map((item: any, idx: number) => {
                    const totalQty = item.qty || item.quantity || 1
                    const alreadyRefunded = item.refunded_qty || 0
                    const sel = refundItemsSelection[idx] || { returnQty: 0, maxQty: Math.max(0, totalQty - alreadyRefunded) }
                    const isFullyRefunded = sel.maxQty <= 0

                    return (
                      <div key={idx} className={`flex justify-between items-center py-2 border-b border-slate-800 last:border-0 ${isFullyRefunded ? 'opacity-50 bg-slate-800/40 px-2 rounded-xl' : ''}`}>
                        <div>
                          <div className="font-bold flex items-center space-x-1.5">
                            <span>{item.name} {item.selectedVariant ? `[${item.selectedVariant.name}]` : ''}</span>
                            {isFullyRefunded && <span className="bg-red-900 text-red-200 text-[8px] font-black uppercase px-1.5 py-0.2 rounded">Fully Refunded</span>}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {currencySymbol} {item.finalUnitPrice || item.price} each • Total Ordered: {totalQty}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!isFullyRefunded ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = { ...refundItemsSelection }
                                  if (updated[idx].returnQty > 0) updated[idx].returnQty -= 1
                                  setRefundItemsSelection(updated)
                                }}
                                className="w-7 h-7 rounded-lg font-bold flex items-center justify-center cursor-pointer bg-slate-800 hover:bg-slate-700"
                              >
                                -
                              </button>
                              <span className="font-mono font-black w-6 text-center">{sel.returnQty}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = { ...refundItemsSelection }
                                  if (updated[idx].returnQty < updated[idx].maxQty) updated[idx].returnQty += 1
                                  setRefundItemsSelection(updated)
                                }}
                                className="w-7 h-7 rounded-lg font-bold flex items-center justify-center cursor-pointer bg-slate-800 hover:bg-slate-700"
                              >
                                +
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] font-bold text-red-400 font-mono">Locked</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold uppercase tracking-wide text-[11px]">Refund / Damage Reason Code *</label>
                <select
                  value={refundReasonCode}
                  onChange={e => setRefundReasonCode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold uppercase text-white"
                  required
                >
                  <option value="Quality Issue / Damaged">🍔 Quality Issue / Damaged (Write-off Inventory)</option>
                  <option value="Customer Cancelled / Changed Mind">❌ Customer Cancelled / Changed Mind (Restock Stock)</option>
                  <option value="Delivery Mishap / Driver Drop">🛵 Delivery Mishap / Driver Drop</option>
                  <option value="Wrong Item Prepared">⚠️️ Wrong Item Prepared</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border p-3.5 rounded-2xl space-y-1.5 bg-indigo-950/40 border-indigo-900/60">
                  <label className="block text-indigo-300 font-black uppercase tracking-wide text-[10px]">🪪 Manager QR Badge Scan (Instant)</label>
                  <input
                    type="text"
                    placeholder="Scan manager badge token..."
                    value={refundManagerQrToken}
                    onChange={e => setRefundManagerQrToken(e.target.value)}
                    className="w-full bg-slate-900 border border-indigo-800 rounded-xl px-3 py-2 font-mono text-xs font-bold text-white focus:outline-none"
                  />
                </div>

                <div className="border p-3.5 rounded-2xl space-y-1.5 bg-rose-950/40 border-rose-900/60">
                  <label className="block text-rose-300 font-black uppercase tracking-wide text-[10px]">🔑 Manager Security PIN</label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="Enter 4-6 digit PIN..."
                    value={refundManagerPin}
                    onChange={e => setRefundManagerPin(e.target.value)}
                    className="w-full bg-slate-900 border border-rose-800 rounded-xl px-3 py-2 font-mono font-bold tracking-widest text-sm text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end space-x-2 shrink-0 bg-slate-900">
              <button
                type="button"
                onClick={() => setSelectedOrderForRefund(null)}
                className="px-5 py-2.5 font-bold rounded-xl text-xs cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processingRefund}
                className="px-6 py-2.5 bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-sm cursor-pointer"
              >
                {processingRefund ? 'Processing Refund...' : 'Authorize & Process Refund ↩️'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Hidden Thermal Print Staging */}
      <div className="hidden print:block print:w-[80mm] print:m-0 print:p-0">
        {printSrrData && (
          <div ref={printSrrRef} className="print-receipt-wrapper">
            <ThermalSaleReturn srrData={printSrrData} currencySymbol={currencySymbol} />
          </div>
        )}
      </div>
    </div>
  )
}