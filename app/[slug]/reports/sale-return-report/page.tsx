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

export default function SaleReturnReportPage({ params }: PageProps) {
  const { slug } = use(params)
  const router = useRouter()

  const [business, setBusiness] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [salesReturnData, setSalesReturnData] = useState<any[]>([])
  const [loadingSalesReturns, setLoadingSalesReturns] = useState(false)

  // Filters
  const [filterSrrDateFrom, setFilterSrrDateFrom] = useState('')
  const [filterSrrDateTo, setFilterSrrDateTo] = useState('')
  const [filterSrrNo, setFilterSrrNo] = useState('')
  const [filterSrrOrderNo, setFilterSrrOrderNo] = useState('')
  const [filterSrrOrderType, setFilterSrrOrderType] = useState('ALL')
  const [filterSrrItem, setFilterSrrItem] = useState('')
  const [filterSrrAuthorizedBy, setFilterSrrAuthorizedBy] = useState('')

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
        fetchSalesReturnsReport(biz.id)
      }
      setLoading(false)
    }
    init()
  }, [slug, router])

  const fetchSalesReturnsReport = async (businessId: string) => {
    setLoadingSalesReturns(true)
    const { data, error } = await supabase
      .from('sales_returns')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setSalesReturnData(data)
    }
    setLoadingSalesReturns(false)
  }

  const filteredSalesReturnsReports = useMemo(() => {
    return salesReturnData.filter(srr => {
      if (filterSrrDateFrom) {
        const srrDate = new Date(srr.created_at).toISOString().split('T')[0]
        if (srrDate < filterSrrDateFrom) return false
      }
      if (filterSrrDateTo) {
        const srrDate = new Date(srr.created_at).toISOString().split('T')[0]
        if (srrDate > filterSrrDateTo) return false
      }
      if (filterSrrNo.trim()) {
        if (!(srr.srr_number || '').toLowerCase().includes(filterSrrNo.trim().toLowerCase())) return false
      }
      if (filterSrrOrderNo.trim()) {
        if (!(srr.order_number || '').toLowerCase().includes(filterSrrOrderNo.trim().toLowerCase())) return false
      }
      if (filterSrrOrderType !== 'ALL') {
        if ((srr.order_type || '').toUpperCase() !== filterSrrOrderType.toUpperCase()) return false
      }
      if (filterSrrItem.trim()) {
        if (!(srr.returned_items_description || '').toLowerCase().includes(filterSrrItem.trim().toLowerCase())) return false
      }
      if (filterSrrAuthorizedBy.trim()) {
        if (!(srr.authorized_by || '').toLowerCase().includes(filterSrrAuthorizedBy.trim().toLowerCase())) return false
      }
      return true
    })
  }, [salesReturnData, filterSrrDateFrom, filterSrrDateTo, filterSrrNo, filterSrrOrderNo, filterSrrOrderType, filterSrrItem, filterSrrAuthorizedBy])

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-gray-700 text-xs">Loading Sales Return Report...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 flex flex-col h-screen overflow-hidden font-sans select-none text-xs">
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shrink-0 shadow-2xs">
        <div>
          <h2 className="text-sm font-black uppercase text-gray-900 tracking-wide">Sales Return Passes & Audit Hub</h2>
          <p className="text-[11px] text-gray-500">Tenant Slug: <span className="font-mono font-bold text-gray-800">{slug}</span></p>
        </div>
        <button onClick={() => router.push(`/${slug}`)} className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl text-xs transition cursor-pointer">
          ← Back to Dashboard
        </button>
      </header>

      <main className="flex-1 px-8 pt-4 pb-8 max-w-7xl mx-auto w-full space-y-4 overflow-y-auto">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
          <div className="font-black text-gray-900 uppercase tracking-wide text-[11px] flex justify-between items-center">
            <span>🔍 Sales Return Report Filters</span>
            <button 
              onClick={() => { setFilterSrrDateFrom(''); setFilterSrrDateTo(''); setFilterSrrNo(''); setFilterSrrOrderNo(''); setFilterSrrOrderType('ALL'); setFilterSrrItem(''); setFilterSrrAuthorizedBy(''); }}
              className="text-rose-600 hover:underline font-bold text-[10px] cursor-pointer"
            >
              Clear Filters
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Date From</label>
              <input type="date" value={filterSrrDateFrom} onChange={e => setFilterSrrDateFrom(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 font-mono text-xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Date To</label>
              <input type="date" value={filterSrrDateTo} onChange={e => setFilterSrrDateTo(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 font-mono text-xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-0.5">SRR Number</label>
              <input type="text" placeholder="Search SRR..." value={filterSrrNo} onChange={e => setFilterSrrNo(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-mono text-xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Order Number</label>
              <input type="text" placeholder="Search order..." value={filterSrrOrderNo} onChange={e => setFilterSrrOrderNo(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-mono text-xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Order Type</label>
              <select value={filterSrrOrderType} onChange={e => setFilterSrrOrderType(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-bold uppercase text-xs">
                <option value="ALL">ALL TYPES</option>
                <option value="DINE-IN">DINE-IN</option>
                <option value="TAKEAWAY">TAKEAWAY</option>
                <option value="DELIVERY">DELIVERY</option>
                <option value="COUNTER">COUNTER</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Item Name</label>
              <input type="text" placeholder="Search item..." value={filterSrrItem} onChange={e => setFilterSrrItem(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Authorized By</label>
            <input type="text" placeholder="Search authorizer..." value={filterSrrAuthorizedBy} onChange={e => setFilterSrrAuthorizedBy(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100 text-gray-500 uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3">Date/Time</th>
                <th className="p-3">SRR Number</th>
                <th className="p-3">Order Number</th>
                <th className="p-3">Order Type & Payment</th>
                <th className="p-3">Returned Items Description</th>
                <th className="p-3">Return Reason</th>
                <th className="p-3">Authorized By</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loadingSalesReturns ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400 font-bold">Querying sales return passes...</td></tr>
              ) : filteredSalesReturnsReports.length > 0 ? (
                filteredSalesReturnsReports.map(srr => (
                  <tr key={srr.id} className="hover:bg-gray-50 transition">
                    <td className="p-3 font-mono text-[10px] text-gray-500">
                      {new Date(srr.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="p-3 font-mono font-black text-indigo-700">{srr.srr_number}</td>
                    <td className="p-3 font-mono font-bold text-gray-900">{srr.order_number}</td>
                    <td className="p-3">
                      <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded text-[9px] uppercase mr-1">{srr.order_type}</span>
                      <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">{srr.payment_mode}</div>
                    </td>
                    <td className="p-3 font-medium text-gray-900 max-w-xs">{srr.returned_items_description}</td>
                    <td className="p-3 text-rose-700 font-semibold">{srr.return_reason}</td>
                    <td className="p-3 font-bold text-gray-800">{srr.authorized_by}</td>
                    <td className="p-3 text-right font-mono font-black text-rose-600 text-sm">
                      {business?.currency_symbol || 'Rs.'} {srr.amount}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">No sales return passes recorded matching the criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}