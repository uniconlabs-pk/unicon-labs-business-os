'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { getBusinessProfile } from '@/lib/businessProfiles'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function TenantOrderManagement({ params }: PageProps) {
  const { slug } = use(params)
  const router = useRouter()

  const [business, setBusiness] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('ALL')

  useEffect(() => {
    const rawSession = localStorage.getItem(`tenant_session_${slug}`)
    if (!rawSession) {
      router.push(`/${slug}/login`)
      return
    }

    async function fetchOrderData() {
      // 1. Fetch Tenant Business Record strictly by slug
      const { data: biz, error: bizErr } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .single()

      if (bizErr || !biz) {
        router.push('/')
        return
      }
      setBusiness(biz)
      setProfile(getBusinessProfile(biz.business_type))

      // 2. Fetch Orders for this Business ID
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', biz.id)
        .order('created_at', { ascending: false })

      if (orderData) {
        setOrders(orderData)
      } else if (orderErr) {
        console.error('Error fetching orders:', orderErr.message)
      }

      setLoading(false)
    }

    fetchOrderData()
  }, [slug, router])

  // Update Order Status Handler
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)

    if (error) {
      alert(`Failed to update order status: ${error.message}`)
    } else {
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    }
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-gray-700">
        Loading {profile?.terminology?.ordersLabel || 'Order Management'}...
      </div>
    )
  }

  const filteredOrders = filterStatus === 'ALL' 
    ? orders 
    : orders.filter(o => (o.status || 'pending').toUpperCase() === filterStatus)

  const currencySymbol = business?.currency_symbol || 'Rs.'

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 flex flex-col font-sans">
      
      {/* HEADER BAR */}
      <header className="bg-white border-b border-gray-200 px-8 py-5 flex justify-between items-center shadow-xs">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-inner">
            {profile.modules.hasDispatchQueue ? '📦' : '📋'}
          </div>
          <div>
            <h1 className="text-base font-black uppercase text-gray-900 tracking-wide flex items-center space-x-2">
              <span>{profile.terminology.ordersLabel}</span>
              <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${profile.badgeColor}`}>
                {profile.displayName}
              </span>
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              Active Tenant: <span className="font-bold text-gray-900">{business?.name}</span> | Slug: <span className="font-mono font-bold">{slug}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <a href={`/${slug}`} className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5">
            <span>⬅️</span>
            <span>Back to Dashboard</span>
          </a>
        </div>
      </header>

      {/* MAIN CONTENT WORKSPACE */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
        
        {/* STATUS FILTER BAR */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-extrabold uppercase text-gray-500">Filter Status:</span>
            <div className="flex space-x-1">
              {['ALL', 'PENDING', 'PROCESSING', 'DISPATCHED', 'COMPLETED'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition uppercase ${
                    filterStatus === status ? 'bg-slate-900 text-white shadow-2xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs font-mono font-bold text-gray-600 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
            Total Records: <span className="text-emerald-700">{filteredOrders.length}</span>
          </div>
        </div>

        {/* ORDERS TABLE / LIST */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-extrabold uppercase text-[10px]">
                  <th className="p-4">Order ID / Date</th>
                  <th className="p-4">Customer Details</th>
                  <th className="p-4">Items / Summary</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Fulfillment Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map(order => {
                    const statusUpper = (order.status || 'pending').toUpperCase()
                    const badgeStyle = statusUpper === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                       statusUpper === 'DISPATCHED' ? 'bg-blue-100 text-blue-800' :
                                       statusUpper === 'PROCESSING' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'

                    return (
                      <tr key={order.id} className="hover:bg-gray-50/80 transition">
                        <td className="p-4 align-top font-mono">
                          <div className="font-black text-gray-900">#{order.id.slice(0, 8).toUpperCase()}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {new Date(order.created_at).toLocaleString()}
                          </div>
                        </td>

                        <td className="p-4 align-top space-y-0.5">
                          <div className="font-bold text-gray-900">{order.customer_name || 'Walk-in Customer'}</div>
                          <div className="text-gray-500">{order.customer_phone || 'No phone provided'}</div>
                          <div className="text-[10px] text-gray-400 truncate max-w-xs">{order.delivery_address || 'Counter Pickup'}</div>
                        </td>

                        <td className="p-4 align-top">
                          <div className="max-w-xs space-y-1">
                            {Array.isArray(order.items) && order.items.length > 0 ? (
                              order.items.map((it: any, iIdx: number) => (
                                <div key={iIdx} className="text-gray-700 flex justify-between">
                                  <span>{it.qty}x {it.name}</span>
                                  <span className="font-mono text-gray-500">{currencySymbol} {(it.finalUnitPrice || it.price) * it.qty}</span>
                                </div>
                              ))
                            ) : (
                              <span className="text-gray-400 italic">No item breakdown recorded</span>
                            )}
                          </div>
                        </td>

                        <td className="p-4 align-top font-mono font-black text-emerald-700">
                          {currencySymbol} {order.total_amount || order.grand_total || 0}
                        </td>

                        <td className="p-4 align-top">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${badgeStyle}`}>
                            {statusUpper}
                          </span>
                        </td>

                        <td className="p-4 align-top text-right space-x-2">
                          <select
                            value={order.status || 'pending'}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-gray-900 font-bold uppercase focus:outline-none focus:border-slate-900 text-[11px]"
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="dispatched">Dispatched</option>
                            <option value="completed">Completed</option>
                          </select>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-20 text-gray-400">
                      No order records found in database for this tenant.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

    </div>
  )
}