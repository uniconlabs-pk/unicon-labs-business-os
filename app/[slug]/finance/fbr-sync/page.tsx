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

export default function FBRAuditSyncPage({ params }: PageProps) {
  const { slug } = use(params)
  const router = useRouter()

  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [syncingId, setSyncingId] = useState<string | null>(null)

  useEffect(() => {
    loadFiscalOrders()
  }, [slug])

  async function loadFiscalOrders() {
    setLoading(true)
    const { data: biz } = await supabase
      .from('businesses')
      .select('id, enable_fbr_integration, fbr_pos_id')
      .eq('slug', slug)
      .single()

    if (!biz) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('business_id', biz.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error && data) {
      setOrders(data)
    }
    setLoading(false)
  }

  const handleManualRetrySync = async (orderId: string) => {
    setSyncingId(orderId)
    try {
      const res = await fetch('/api/fbr/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, slug })
      })
      const json = await res.json()
      if (res.ok) {
        alert('FBR manual retry sync executed.')
      } else {
        alert(`Sync warning/error: ${json.error || 'Check server logs'}`)
      }
      await loadFiscalOrders()
    } catch (err: any) {
      alert(`Network error during retry: ${err.message}`)
    } finally {
      setSyncingId(null)
    }
  }

  const filteredOrders = orders.filter(o => {
    if (filterStatus === 'ALL') return true
    return o.fiscal_status === filterStatus
  })

  if (loading) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center text-xs">Loading FBR Fiscal Audit Queue...</div>
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col font-sans text-xs">
      {/* Header */}
      <header className="px-8 py-5 border-b border-gray-800 flex justify-between items-center bg-black/40 backdrop-blur-md">
        <div>
          <button onClick={() => router.push(`/${slug}/finance`)} className="text-gray-400 hover:text-white mb-1 block">
            ← Back to ERP / Finance
          </button>
          <h1 className="text-xl font-extrabold tracking-wide">FBR Fiscal Audit & Retry Queue</h1>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Tenant Slug: /{slug}</p>
        </div>
        <button
          onClick={loadFiscalOrders}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-xl font-bold transition"
        >
          🔄 Refresh Queue
        </button>
      </header>

      {/* Main Content */}
      <main className="p-8 max-w-7xl mx-auto flex-1 w-full space-y-6">
        {/* Filter Pills */}
        <div className="flex space-x-2">
          {['ALL', 'pending_fbr_sync', 'synced', 'non_fiscal'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl font-bold uppercase transition ${
                filterStatus === status ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {status} ({orders.filter(o => status === 'ALL' || o.fiscal_status === status).length})
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-md overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-900 text-gray-400 uppercase text-[10px]">
              <tr>
                <th className="p-3">Order ID / Date</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Total Amount</th>
                <th className="p-3">Tender Mode</th>
                <th className="p-3">Fiscal Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredOrders.length > 0 ? (
                filteredOrders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-700/50 transition">
                    <td className="p-3">
                      <div className="font-mono text-emerald-300 font-bold">#{o.id.slice(0, 8)}</div>
                      <div className="text-[10px] text-gray-400">{new Date(o.created_at).toLocaleString()}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-white">{o.customer_name}</div>
                      <div className="text-[10px] text-gray-400">{o.customer_phone || 'No phone'}</div>
                    </td>
                    <td className="p-3 font-mono font-black text-white">Rs. {o.total_amount}</td>
                    <td className="p-3 uppercase text-gray-300">{o.payment_method}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        o.fiscal_status === 'synced' ? 'bg-green-900/50 text-green-300' :
                        o.fiscal_status === 'pending_fbr_sync' ? 'bg-amber-900/50 text-amber-300' : 'bg-gray-700 text-gray-300'
                      }`}>
                        {o.fiscal_status || 'non_fiscal'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {o.fiscal_status === 'pending_fbr_sync' || o.fiscal_status === 'failed' ? (
                        <button
                          disabled={syncingId === o.id}
                          onClick={() => handleManualRetrySync(o.id)}
                          className="px-3 py-1 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg font-bold text-[10px] transition"
                        >
                          {syncingId === o.id ? 'Syncing...' : 'Retry FBR Sync'}
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">No orders match this fiscal filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}