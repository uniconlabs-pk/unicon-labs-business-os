'use client'

import { useState, useEffect, use, useMemo } from 'react'
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

  // Filtration & Pagination States
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterStaffName, setFilterStaffName] = useState('ALL')
  const [rowsPerPage, setRowsPerPage] = useState<number>(25)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Settlement Drawer States & Search filters
  const [showSettlementModal, setShowSettlementModal] = useState(false)
  const [selectedStaffIdForSettlement, setSelectedStaffIdForSettlement] = useState('')
  const [waiterSearch, setWaiterSearch] = useState('')
  const [riderSearch, setRiderSearch] = useState('')
  const [pendingOrdersForStaff, setPendingOrdersForStaff] = useState<any[]>([])
  const [settlementInputs, setSettlementInputs] = useState<{ [orderId: string]: { received: string; discount: string; notes: string } }>({})
  const [processingSettlement, setProcessingSettlement] = useState(false)

  // ESC key listener to close settlement drawer instantly (unless focused on search inputs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showSettlementModal) {
        const activeEl = document.activeElement
        const isSearchInput = activeEl?.tagName === 'INPUT' && (
          (activeEl as HTMLInputElement).placeholder?.toLowerCase().includes('search')
        )
        if (!isSearchInput) {
          setShowSettlementModal(false)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showSettlementModal])

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
      .neq('settlement_status', 'SETTLED')
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
        const discount = parseFloat(input.discount) || 0
        const netReceived = Math.max(0, billed - discount)

        await supabase.from('cash_liquidity_transactions').insert([{
          business_id: business.id,
          invoice_id: ord.id,
          staff_id: selectedStaffIdForSettlement,
          staff_name: staffFullName,
          billed_amount: billed,
          amount_received: netReceived,
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
      setSelectedStaffIdForSettlement('')
      setWaiterSearch('')
      setRiderSearch('')
      setPendingOrdersForStaff([])
      setSettlementInputs({})
      setShowSettlementModal(false)
      fetchCashLiquidityReport(business.id)
    } catch (err: any) {
      alert(`Settlement failed: ${err.message}`)
    }
    setProcessingSettlement(false)
  }

  // Filtered Liquidity Data Computation
  const filteredLiquidityData = useMemo(() => {
    return cashLiquidityData.filter(txn => {
      if (filterDateFrom) {
        const txnDate = new Date(txn.created_at).toISOString().split('T')[0]
        if (txnDate < filterDateFrom) return false
      }
      if (filterDateTo) {
        const txnDate = new Date(txn.created_at).toISOString().split('T')[0]
        if (txnDate > filterDateTo) return false
      }
      if (filterStaffName !== 'ALL') {
        if ((txn.staff_name || '').trim().toLowerCase() !== filterStaffName.trim().toLowerCase()) return false
      }
      return true
    })
  }, [cashLiquidityData, filterDateFrom, filterDateTo, filterStaffName])

  // Grand Totals across all filtered records
  const grandTotals = useMemo(() => {
    return filteredLiquidityData.reduce((acc, txn) => {
      acc.billed += parseFloat(txn.billed_amount) || 0
      acc.discount += parseFloat(txn.discount_amount) || 0
      acc.received += parseFloat(txn.amount_received) || 0
      return acc
    }, { billed: 0, discount: 0, received: 0 })
  }, [filteredLiquidityData])

  // Pagination Slice
  const paginatedLiquidityData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage
    return filteredLiquidityData.slice(start, start + rowsPerPage)
  }, [filteredLiquidityData, currentPage, rowsPerPage])

  const totalPages = Math.ceil(filteredLiquidityData.length / rowsPerPage) || 1

  // Page Subtotals for active page
  const pageSubtotals = useMemo(() => {
    return paginatedLiquidityData.reduce((acc, txn) => {
      acc.billed += parseFloat(txn.billed_amount) || 0
      acc.discount += parseFloat(txn.discount_amount) || 0
      acc.received += parseFloat(txn.amount_received) || 0
      return acc
    }, { billed: 0, discount: 0, received: 0 })
  }, [paginatedLiquidityData])

  // Unique Staff list for filter dropdown
  const uniqueStaffNames = useMemo(() => {
    const names = new Set<string>()
    cashLiquidityData.forEach(t => {
      if (t.staff_name) names.add(t.staff_name.trim())
    })
    return Array.from(names)
  }, [cashLiquidityData])

  // Filter staff lists strictly for Waiters and Riders with manual search capability
  const waitersList = staffList.filter(st => {
    const r = (st.role || '').toLowerCase()
    const d = (st.department || '').toLowerCase()
    const isWaiter = r.includes('waiter') || d.includes('service') || r.includes('server') || d.includes('waitstaff')
    return isWaiter
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
        
        {/* HEADER ACTION & FILTRATION HUB */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
          <div className="flex justify-between items-center">
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

          <div className="pt-3 border-t border-gray-100 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">Date From</label>
              <input type="date" value={filterDateFrom} onChange={e => { setFilterDateFrom(e.target.value); setCurrentPage(1); }} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 font-mono text-xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">Date To</label>
              <input type="date" value={filterDateTo} onChange={e => { setFilterDateTo(e.target.value); setCurrentPage(1); }} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 font-mono text-xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">Staff / Collector</label>
              <select value={filterStaffName} onChange={e => { setFilterStaffName(e.target.value); setCurrentPage(1); }} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 font-bold text-xs">
                <option value="ALL">ALL STAFF MEMBERS</option>
                {uniqueStaffNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">Rows Per Page</label>
              <select value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 font-bold text-xs">
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
            <div>
              <button
                type="button"
                onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setFilterStaffName('ALL'); setCurrentPage(1); }}
                className="w-full py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Clear Filters 🔄
              </button>
            </div>
          </div>
        </div>

        {/* REPORT TABLE */}
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
              ) : paginatedLiquidityData.length > 0 ? (
                paginatedLiquidityData.map(txn => {
                  const netReceivedVal = parseFloat(txn.amount_received) || 0

                  return (
                    <tr key={txn.id} className="hover:bg-gray-50 transition">
                      <td className="p-3 font-mono text-[10px] text-gray-500">{new Date(txn.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td className="p-3 font-bold text-gray-900">{txn.staff_name || 'Staff Member'}</td>
                      <td className="p-3"><span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded text-[9px] uppercase">{txn.payment_method}</span></td>
                      <td className="p-3 font-mono text-gray-700">{business?.currency_symbol || 'Rs.'} {txn.billed_amount}</td>
                      <td className="p-3 font-mono text-rose-600">{business?.currency_symbol || 'Rs.'} {txn.discount_amount || '0.00'}</td>
                      <td className="p-3 text-right font-mono font-black text-emerald-700 text-sm">
                        {business?.currency_symbol || 'Rs.'} {netReceivedVal.toFixed(2)}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No cash liquidity transactions recorded yet.</td></tr>
              )}
            </tbody>
            
            {/* SUBTOTAL & GRAND TOTAL FOOTER ROWS */}
            {paginatedLiquidityData.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-mono font-bold text-xs">
                <tr>
                  <td colSpan={3} className="p-3 uppercase text-[10px] text-gray-500">Page Subtotal (Showing {paginatedLiquidityData.length} of {filteredLiquidityData.length})</td>
                  <td className="p-3 text-gray-800">{business?.currency_symbol || 'Rs.'} {pageSubtotals.billed.toFixed(2)}</td>
                  <td className="p-3 text-rose-600">{business?.currency_symbol || 'Rs.'} {pageSubtotals.discount.toFixed(2)}</td>
                  <td className="p-3 text-right text-emerald-700 font-black">{business?.currency_symbol || 'Rs.'} {pageSubtotals.received.toFixed(2)}</td>
                </tr>
                <tr className="bg-gray-100 border-t border-gray-200 text-gray-900">
                  <td colSpan={3} className="p-3 uppercase text-[11px] font-black">Grand Total (All Filtered Records)</td>
                  <td className="p-3 font-black">{business?.currency_symbol || 'Rs.'} {grandTotals.billed.toFixed(2)}</td>
                  <td className="p-3 font-black text-rose-600">{business?.currency_symbol || 'Rs.'} {grandTotals.discount.toFixed(2)}</td>
                  <td className="p-3 text-right font-black text-emerald-700 text-sm">{business?.currency_symbol || 'Rs.'} {grandTotals.received.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <span className="text-[11px] text-gray-500 font-medium">
              Page <span className="font-bold text-gray-800">{currentPage}</span> of <span className="font-bold text-gray-800">{totalPages}</span>
            </span>
            <div className="flex space-x-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 disabled:opacity-40 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                ← Previous
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 disabled:opacity-40 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </main>

      {/* BATCH SETTLEMENT DRAWER */}
      {showSettlementModal && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans">
          <div onClick={() => setShowSettlementModal(false)} className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity" />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen md:w-[55vw] bg-white border-l border-gray-200 shadow-2xl flex flex-col text-gray-800">
              
              <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="font-black text-sm uppercase text-gray-900">Staff Cash Drop & Batch Settlement</h3>
                  <p className="text-[10px] text-gray-500">Select staff member, review pending bills, and settle cash with adjustments.</p>
                </div>
                <button onClick={() => setShowSettlementModal(false)} className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center font-bold transition cursor-pointer">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                        onKeyDown={e => { if (e.key === 'Escape') setWaiterSearch('') }}
                        className="w-full bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-blue-600"
                      />
                      <select
                        value={waitersList.some(st => st.id === selectedStaffIdForSettlement) ? selectedStaffIdForSettlement : ''}
                        onChange={e => {
                          const val = e.target.value
                          setSelectedStaffIdForSettlement(val)
                          if (val) fetchPendingOrdersForStaff(val)
                        }}
                        size={waiterSearch.trim() ? Math.min(Math.max(waitersList.length + 1, 2), 5) : 1}
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
                        onKeyDown={e => { if (e.key === 'Escape') setRiderSearch('') }}
                        className="w-full bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-blue-600"
                      />
                      <select
                        value={ridersList.some(st => st.id === selectedStaffIdForSettlement) ? selectedStaffIdForSettlement : ''}
                        onChange={e => {
                          const val = e.target.value
                          setSelectedStaffIdForSettlement(val)
                          if (val) fetchPendingOrdersForStaff(val)
                        }}
                        size={riderSearch.trim() ? Math.min(Math.max(ridersList.length + 1, 2), 5) : 1}
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
                                        setSettlementInputs({
                                          ...settlementInputs,
                                          [ord.id]: { ...input, received: val }
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
                                      onChange={e => {
                                        const discVal = e.target.value
                                        const billed = parseFloat(ord.total_amount) || 0
                                        const disc = parseFloat(discVal) || 0
                                        const autoReceived = Math.max(0, billed - disc)
                                        setSettlementInputs({
                                          ...settlementInputs,
                                          [ord.id]: { ...input, discount: discVal, received: String(autoReceived) }
                                        })
                                      }}
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

                  <div className="flex justify-between items-center pt-4 border-t">
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
          </div>
        </div>
      )}
    </div>
  )
}