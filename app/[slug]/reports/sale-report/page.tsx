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

export default function SaleReportPage({ params }: PageProps) {
  const { slug } = use(params)
  const router = useRouter()

  const [business, setBusiness] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [salesReportData, setSalesReportData] = useState<any[]>([])
  const [loadingSales, setLoadingSales] = useState(false)

  // Filters
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterCustQuery, setFilterCustQuery] = useState('')
  const [filterOrderNo, setFilterOrderNo] = useState('')
  const [filterOrderType, setFilterOrderType] = useState('ALL')
  const [filterPaymentMode, setFilterPaymentMode] = useState('ALL')
  const [filterWaiterName, setFilterWaiterName] = useState('')
  const [filterRiderName, setFilterRiderName] = useState('')

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
        fetchSalesReport(biz.id)
      }
      setLoading(false)
    }
    init()
  }, [slug, router])

  const fetchSalesReport = async (businessId: string) => {
    setLoadingSales(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setSalesReportData(data)
    }
    setLoadingSales(false)
  }

  const filteredSalesReports = useMemo(() => {
    return salesReportData.filter(ord => {
      if (filterDateFrom) {
        const orderDate = new Date(ord.created_at).toISOString().split('T')[0]
        if (orderDate < filterDateFrom) return false
      }
      if (filterDateTo) {
        const orderDate = new Date(ord.created_at).toISOString().split('T')[0]
        if (orderDate > filterDateTo) return false
      }
      if (filterCustQuery.trim()) {
        const q = filterCustQuery.trim().toLowerCase()
        const cName = (ord.customer_name || '').toLowerCase()
        const cPhone = (ord.customer_phone || '').toLowerCase()
        if (!cName.includes(q) && !cPhone.includes(q)) return false
      }
      if (filterOrderNo.trim()) {
        const idStr = String(ord.order_number || ord.id || '').toLowerCase()
        if (!idStr.includes(filterOrderNo.trim().toLowerCase())) return false
      }
      if (filterOrderType !== 'ALL') {
        if ((ord.service_type || '').toUpperCase() !== filterOrderType.toUpperCase()) return false
      }
      if (filterPaymentMode !== 'ALL') {
        if (!(ord.payment_method || '').toUpperCase().includes(filterPaymentMode.toUpperCase())) return false
      }
      if (filterWaiterName.trim()) {
        const wName = (ord.waiter_name || '').toLowerCase()
        if (!wName.includes(filterWaiterName.trim().toLowerCase())) return false
      }
      if (filterRiderName.trim() && (ord.service_type || '').toUpperCase() === 'DELIVERY') {
        const rName = (ord.rider_name || ord.rider || '').toLowerCase()
        if (!rName.includes(filterRiderName.trim().toLowerCase())) return false
      }
      return true
    })
  }, [salesReportData, filterDateFrom, filterDateTo, filterCustQuery, filterOrderNo, filterOrderType, filterPaymentMode, filterWaiterName, filterRiderName])

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-gray-700 text-xs">Loading Sale Report...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 flex flex-col h-screen overflow-hidden font-sans select-none text-xs">
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shrink-0 shadow-2xs">
        <div>
          <h2 className="text-sm font-black uppercase text-gray-900 tracking-wide">Advanced Sales Report & Audit Hub</h2>
          <p className="text-[11px] text-gray-500">Tenant Slug: <span className="font-mono font-bold text-gray-800">{slug}</span></p>
        </div>
        <button onClick={() => router.push(`/${slug}`)} className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl text-xs transition cursor-pointer">
          ← Back to Dashboard
        </button>
      </header>

      <main className="flex-1 px-8 pt-4 pb-8 max-w-7xl mx-auto w-full space-y-4 overflow-y-auto">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
          <div className="font-black text-gray-900 uppercase tracking-wide text-[11px] flex justify-between items-center">
            <span>🔍 Sales Report Filters</span>
            <button 
              onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setFilterCustQuery(''); setFilterOrderNo(''); setFilterOrderType('ALL'); setFilterPaymentMode('ALL'); setFilterWaiterName(''); setFilterRiderName(''); }}
              className="text-rose-600 hover:underline font-bold text-[10px] cursor-pointer"
            >
              Clear Filters
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Date From</label>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 font-mono" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Date To</label>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 font-mono" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Customer Name / Phone</label>
              <input type="text" placeholder="Search customer..." value={filterCustQuery} onChange={e => setFilterCustQuery(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-medium" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Order Number / ID</label>
              <input type="text" placeholder="KB-..." value={filterOrderNo} onChange={e => setFilterOrderNo(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-mono" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Order Type</label>
              <select value={filterOrderType} onChange={e => setFilterOrderType(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-bold uppercase">
                <option value="ALL">ALL TYPES</option>
                <option value="DINE-IN">DINE-IN</option>
                <option value="TAKEAWAY">TAKEAWAY</option>
                <option value="DELIVERY">DELIVERY</option>
                <option value="COUNTER">COUNTER</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Payment Mode</label>
              <select value={filterPaymentMode} onChange={e => setFilterPaymentMode(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-bold uppercase">
                <option value="ALL">ALL MODES</option>
                <option value="CASH">CASH</option>
                <option value="CARD">CARD</option>
                <option value="CASH ON DELIVERY">CASH ON DELIVERY</option>
                <option value="DIGITAL WALLET">DIGITAL WALLET</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Waiter Name</label>
              <input type="text" placeholder="Search waiter..." value={filterWaiterName} onChange={e => setFilterWaiterName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-medium" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Delivery Rider Name</label>
              <input type="text" placeholder="Search rider..." value={filterRiderName} onChange={e => setFilterRiderName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-medium" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100 text-gray-500 uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3">Order # / Date</th>
                <th className="p-3">Type & Payment</th>
                <th className="p-3">Customer Details</th>
                <th className="p-3">Staff / Waiter / Rider</th>
                <th className="p-3 text-right">Grand Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loadingSales ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400 font-bold">Querying sales archive...</td></tr>
              ) : filteredSalesReports.length > 0 ? (
                filteredSalesReports.map(ord => {
                  const isPendingCash = (ord.settlement_status || '').toUpperCase() === 'PENDING_CASH' || 
                    (!ord.settlement_status && (
                      ((ord.service_type || '').toUpperCase() === 'DINE-IN' && ord.waiter_name) ||
                      ((ord.service_type || '').toUpperCase() === 'DELIVERY' && (ord.payment_method || '').toUpperCase().includes('COD'))
                    ));

                  return (
                    <tr key={ord.id} className="hover:bg-gray-50 transition">
                      <td className="p-3">
                        <div className="font-mono font-black text-gray-900">{ord.order_number ? `KB-${String(ord.order_number).padStart(6, '0')}` : 'SAVED'}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{new Date(ord.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-1 mb-1">
                          <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded text-[9px] uppercase">{ord.service_type || 'COUNTER'}</span>
                          <span className="text-[10px] text-emerald-700 font-semibold">{ord.payment_method || 'CASH'}</span>
                        </div>
                        <div>
                          {isPendingCash ? (
                            <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider inline-flex items-center space-x-1 animate-pulse">
                              <span>⏳</span>
                              <span>PENDING CASH</span>
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider inline-flex items-center space-x-1">
                              <span>✓</span>
                              <span>SETTLED</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-gray-900">{ord.customer_name || 'Walk-In'}</div>
                        <div className="text-[10px] text-gray-500 font-mono">{ord.customer_phone || 'No Phone'}</div>
                      </td>
                      <td className="p-3 text-[11px] text-gray-600">
                        <div>Waiter: <span className="font-bold text-gray-900">{ord.waiter_name || 'N/A'}</span></div>
                        <div>Rider: <span className="font-bold text-gray-900">{ord.rider_name || ord.rider || 'N/A'}</span></div>
                      </td>
                      <td className="p-3 text-right font-mono font-black text-emerald-700 text-sm">
                        {business?.currency_symbol || 'Rs.'} {ord.total_amount}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">No matching sales records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}