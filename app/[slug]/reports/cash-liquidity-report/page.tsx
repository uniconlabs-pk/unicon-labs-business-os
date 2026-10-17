'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function CashLiquidityReportPage({ params }: PageProps) {
  const { slug } = use(params)
  const router = useRouter()

  const [business, setBusiness] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [cashLiquidityData, setCashLiquidityData] = useState<any[]>([])
  const [loadingLiquidity, setLoadingLiquidity] = useState(false)
  const [staffList, setStaffList] = useState<any[]>([])

  // Settlement Modal States & Search filters
  const [showSettlementModal, setShowSettlementModal] = useState(false)
  const [selectedStaffIdForSettlement, setSelectedStaffIdForSettlement] = useState('')
  const [waiterSearch, setWaiterSearch] = useState('')
  const [riderSearch, setRiderSearch] = useState('')
  const [pendingOrdersForStaff, setPendingOrdersForStaff] = useState<any[]>([])
  const [settlementInputs, setSettlementInputs] = useState<{ [orderId: string]: { received: string; discount: string; notes: string } }>({})
  const [processingSettlement, setProcessingSettlement] = useState(false)

  useEffect(() => {
    const rawSession = localStorage.getItem(`tenant_session_${slug}`)
    if (!rawSession) {
      router.push(`/${slug}/login`)
      return
    }

    async function init() {
      const { data: biz } = await supabase.from('businesses').select('*').eq('slug', slug).single()
      if (biz) {
        setBusiness(biz)
        fetchCashLiquidityReport(biz.id)
        fetchStaffList(biz.id)
      }
      setLoading(false)
    }
    init()
  }, [slug, router])

  const fetchCashLiquidityReport = async (businessId: string) => {
    setLoadingLiquidity(true)
    const { data, error } = await supabase
      .from('cash_liquidity_transactions')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setCashLiquidityData(data)
    }
    setLoadingLiquidity(false)
  }

  const fetchStaffList = async (businessId: string) => {
    const { data } = await supabase.from('staff_profiles').select('*').eq('business_id', businessId)
    if (data) setStaffList(data)
  }

  const fetchPendingOrdersForStaff = async (staffId: string) => {
    if (!business?.id || !staffId) return

    const selectedStaff = staffList.find(st => st.id === staffId)
    const staffName = selectedStaff ? (selectedStaff.full_name || selectedStaff.name) : ''

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      const pendingForThisStaff = data.filter(ord => {
        const isSettled = (ord.settlement_status || '').toUpperCase() === 'SETTLED'
        if (isSettled) return false

        const matchById = ord.waiter_id === staffId || ord.rider_id === staffId
        const matchByName = staffName && (
          (ord.waiter_name && ord.waiter_name.toLowerCase().includes(staffName.toLowerCase().trim())) ||
          (ord.rider_name && ord.rider_name.toLowerCase().includes(staffName.toLowerCase().trim()))
        )
        const isDineInWaiterOrder = (ord.service_type || '').toUpperCase() === 'DINE-IN' && ord.waiter_name

        return (matchById || matchByName || isDineInWaiterOrder)
      })

      setPendingOrdersForStaff(pendingForThisStaff)

      const initialMap: any = {}
      pendingForThisStaff.forEach(ord => {
        initialMap[ord.id] = {
          received: String(ord.total_amount || 0),
          discount: '0',
          notes: ''
        }
      })
      setSettlementInputs(initialMap)
    } else {
      console.error('Error fetching orders for staff settlement:', error?.message)
    }
  }

  const handleProcessBatchSettlement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStaffIdForSettlement || pendingOrdersForStaff.length === 0) {
      alert('Please select a staff member and at least one pending order.')
      return
    }

    setProcessingSettlement(true)
    try {
      const selectedStaff = staffList.find(st => st.id === selectedStaffIdForSettlement)
      const staffFullName = selectedStaff ? (selectedStaff.full_name || selectedStaff.name) : 'Staff Member'

      for (const ord of pendingOrdersForStaff) {
        const input = settlementInputs[ord.id]
        if (!input) continue

        const billed = parseFloat(ord.total_amount) || 0
        const received = parseFloat(input.received) || 0
        const discount = parseFloat(input.discount) || 0

        await supabase.from('cash_liquidity_transactions').insert([{
          business_id: business.id,
          invoice_id: ord.id,
          staff_id: selectedStaffIdForSettlement,
          staff_name: staffFullName,
          billed_amount: billed,
          amount_received: received,
          discount_amount: discount,
          payment_method: 'CASH',
          notes: input.notes || 'Batch cash drop settlement'
        }])

        await supabase.from('orders').update({
          settlement_status: 'SETTLED',
          settled_at: new Date().toISOString(),
          settlement_shortage: discount
        }).eq('id', ord.id)
      }

      alert('Batch cash drop settled successfully! Ledgers updated.')
      setShowSettlementModal(false)
      fetchCashLiquidityReport(business.id)
    } catch (err: any) {
      alert(`Settlement failed: ${err.message}`)
    }
    setProcessingSettlement(false)
  }

  // Filter staff lists for Waiters and Riders with manual search capability
  const waitersList = staffList.filter(st => {
    const r = (st.role || '').toLowerCase()
    const d = (st.department || '').toLowerCase()
    const isRider = r.includes('rider') || r.includes('delivery') || d.includes('delivery') || d.includes('logistic') || r.includes('driver')
    return !isRider
  }).filter(st => {
    if (!waiterSearch.trim()) return true
    return (st.full_name || st.name || '').toLowerCase().includes(waiterSearch.toLowerCase().trim())
  })

  const ridersList = staffList.filter(st => {
    const r = (st.role || '').toLowerCase()
    const d = (st.department || '').toLowerCase()
    return r.includes('rider') || r.includes('delivery') || d.includes('delivery') || d.includes('logistic') || r.includes('driver')
  }).filter(st => {
    if (!riderSearch.trim()) return true
    return (st.full_name || st.name || '').toLowerCase().includes(riderSearch.toLowerCase().trim())
  })

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-gray-700 text-xs">Loading Cash Liquidity Report...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 flex flex-col h-screen overflow-hidden font-sans select-none text-xs">
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shrink-0 shadow-2xs">
        <div>
          <h2 className="text-sm font-black uppercase text-gray-900 tracking-wide">Cash Liquidity & Inflow Realization Hub</h2>
          <p className="text-[11px] text-gray-500">Tenant Slug: <span className="font-mono font-bold text-gray-800">{slug}</span></p>
        </div>
        <button onClick={() => router.push(`/${slug}`)} className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl text-xs transition cursor-pointer">
          ← Back to Dashboard
        </button>
      </header>

      <main className="flex-1 px-8 pt-4 pb-8 max-w-7xl mx-auto w-full space-y-4 overflow-y-auto">
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
          <div>
            <h3 className="font-black text-gray-900 uppercase tracking-wide text-xs">Cash Liquidity & Inflow Realization</h3>
            <p className="text-[10px] text-gray-500">Tracks actual real cash drops deposited by staff and riders, excluding pending receivables.</p>
          </div>
          <button
            onClick={() => setShowSettlementModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-sm"
          >
            + Process Staff Cash Drop / Batch Settlement 💵
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100 text-gray-500 uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3">Date/Time</th>
                <th className="p-3">Staff / Collector</th>
                <th className="p-3">Payment Method</th>
                <th className="p-3">Billed Amount</th>
                <th className="p-3">Discount / Shortage</th>
                <th className="p-3 text-right">Net Cash Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loadingLiquidity ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400 font-bold">Querying liquidity logs...</td></tr>
              ) : cashLiquidityData.length > 0 ? (
                cashLiquidityData.map(txn => (
                  <tr key={txn.id} className="hover:bg-gray-50 transition">
                    <td className="p-3 font-mono text-[10px] text-gray-500">{new Date(txn.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td className="p-3 font-bold text-gray-900">{txn.staff_name || 'Staff Member'}</td>
                    <td className="p-3"><span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded text-[9px] uppercase">{txn.payment_method}</span></td>
                    <td className="p-3 font-mono text-gray-700">{business?.currency_symbol || 'Rs.'} {txn.billed_amount}</td>
                    <td className="p-3 font-mono text-rose-600">{business?.currency_symbol || 'Rs.'} {txn.discount_amount || '0.00'}</td>
                    <td className="p-3 text-right font-mono font-black text-emerald-700 text-sm">{business?.currency_symbol || 'Rs.'} {txn.amount_received}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No cash liquidity transactions recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* BATCH SETTLEMENT MODAL */}
      {showSettlementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl border border-gray-200 text-gray-800 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-black text-sm uppercase text-gray-900">Staff Cash Drop & Batch Settlement</h3>
                <p className="text-[10px] text-gray-500">Select staff member, review pending bills, and settle cash with adjustments.</p>
              </div>
              <button onClick={() => setShowSettlementModal(false)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleProcessBatchSettlement} className="space-y-4 text-xs">
              
              {/* TWO SEPARATE FIELDS WITH SEARCH FOR WAITER & RIDER SIDE-BY-SIDE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 space-y-2">
                  <label className="block font-bold text-gray-900 uppercase">1. Select Waiter</label>
                  <input
                    type="text"
                    placeholder="Search waiter..."
                    value={waiterSearch}
                    onChange={e => setWaiterSearch(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-blue-600"
                  />
                  <select
                    value={waitersList.some(st => st.id === selectedStaffIdForSettlement) ? selectedStaffIdForSettlement : ''}
                    onChange={e => {
                      const val = e.target.value
                      setSelectedStaffIdForSettlement(val)
                      if (val) fetchPendingOrdersForStaff(val)
                    }}
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 font-bold cursor-pointer"
                  >
                    <option value="">-- Choose Waiter --</option>
                    {waitersList.map(st => (
                      <option key={st.id} value={st.id}>{st.full_name || st.name} ({st.role || 'Waiter'})</option>
                    ))}
                  </select>
                </div>

                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 space-y-2">
                  <label className="block font-bold text-gray-900 uppercase">2. Select Rider</label>
                  <input
                    type="text"
                    placeholder="Search rider..."
                    value={riderSearch}
                    onChange={e => setRiderSearch(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-blue-600"
                  />
                  <select
                    value={ridersList.some(st => st.id === selectedStaffIdForSettlement) ? selectedStaffIdForSettlement : ''}
                    onChange={e => {
                      const val = e.target.value
                      setSelectedStaffIdForSettlement(val)
                      if (val) fetchPendingOrdersForStaff(val)
                    }}
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 font-bold cursor-pointer"
                  >
                    <option value="">-- Choose Rider --</option>
                    {ridersList.map(st => (
                      <option key={st.id} value={st.id}>{st.full_name || st.name} ({st.role || 'Rider'})</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedStaffIdForSettlement && (
                <div className="space-y-2">
                  <h4 className="font-bold uppercase text-gray-700 text-[11px]">Pending Cash Invoices ({pendingOrdersForStaff.length})</h4>
                  {pendingOrdersForStaff.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {pendingOrdersForStaff.map(ord => {
                        const input = settlementInputs[ord.id] || { received: ord.total_amount, discount: '0', notes: '' }
                        return (
                          <div key={ord.id} className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-mono font-black text-gray-900">KB-{String(ord.order_number).padStart(6, '0')}</span>
                              <span className="font-mono font-bold text-emerald-700">Total Billed: {ord.total_amount}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[9px] font-bold text-gray-500">Cash Received</label>
                                <input
                                  type="number"
                                  value={input.received}
                                  onChange={e => {
                                    const val = e.target.value
                                    const billed = parseFloat(ord.total_amount) || 0
                                    const rec = parseFloat(val) || 0
                                    const diff = Math.max(0, billed - rec)
                                    setSettlementInputs({
                                      ...settlementInputs,
                                      [ord.id]: { ...input, received: val, discount: String(diff) }
                                    })
                                  }}
                                  className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 font-mono font-bold"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-gray-500">Discount / Shortage</label>
                                <input
                                  type="number"
                                  value={input.discount}
                                  onChange={e => setSettlementInputs({
                                    ...settlementInputs,
                                    [ord.id]: { ...input, discount: e.target.value }
                                  })}
                                  className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 font-mono text-rose-600 font-bold"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-gray-500">Remarks</label>
                                <input
                                  type="text"
                                  placeholder="Reason..."
                                  value={input.notes}
                                  onChange={e => setSettlementInputs({
                                    ...settlementInputs,
                                    [ord.id]: { ...input, notes: e.target.value }
                                  })}
                                  className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1"
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-400 py-4 text-center">No pending cash orders assigned to this staff member.</p>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t">
                <div className="font-mono font-black text-xs text-gray-900">
                  TOTAL: <span className="text-emerald-700">{business?.currency_symbol || 'Rs.'} {pendingOrdersForStaff.reduce((sum, ord) => sum + (parseFloat(ord.total_amount) || 0), 0).toFixed(2)}</span>
                </div>
                <div className="flex space-x-2">
                  <button type="button" onClick={() => setShowSettlementModal(false)} className="px-4 py-2 bg-gray-200 rounded-xl font-bold cursor-pointer">Cancel/Close</button>
                  <button
                    type="submit"
                    disabled={processingSettlement || pendingOrdersForStaff.length === 0}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow transition cursor-pointer"
                  >
                    {processingSettlement ? 'Processing...' : 'Settle Selected Invoices & Record Liquidity 💵'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}