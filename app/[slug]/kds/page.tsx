'use client'

import { useState, useEffect, use, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { getBusinessProfile } from '@/lib/businessProfiles'
import SecurityGateModal from '@/components/SecurityGateModal'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface KdsTicket {
  id: string
  created_at: string
  kot_no: string
  service_type: string
  status: string
  table_name?: string
  customer_name?: string
  waiter_name?: string
  items: any[]
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function KitchenDisplaySystem({ params }: PageProps) {
  const { slug } = use(params)
  const router = useRouter()
  const [business, setBusiness] = useState<any>(null)
  const [tickets, setTickets] = useState<KdsTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  
  // Security Gate & Staff Authentication States
  const [authenticatedStaff, setAuthenticatedStaff] = useState<any>(null)
  const [showSecurityGate, setShowSecurityGate] = useState(true)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    audioRef.current = new Audio('/sounds/chime.mp3')
    audioRef.current.load()
  }, [])

  const playChime = () => {
    if (isMuted || !audioRef.current) return
    audioRef.current.currentTime = 0
    audioRef.current.play().catch(err => {
      console.log('Audio autoplay blocked or file missing:', err)
    })
  }

  useEffect(() => {
    let businessId: string | null = null

    async function fetchLatestTickets(bizId: string) {
      const { data: ticketData, error } = await supabase
        .from('kds_tickets')
        .select('*')
        .eq('business_id', bizId)
        .order('created_at', { ascending: true })

      if (!error && ticketData) {
        const normalized = ticketData.map(t => ({
          ...t,
          status: t.status || 'pending'
        })).filter(t => ['pending', 'preparing', 'ready'].includes(t.status))

        setTickets(prev => {
          const currentIds = new Set(prev.map(p => p.id))
          const hasNew = normalized.some(n => !currentIds.has(n.id) && n.status === 'pending')
          if (hasNew) {
            playChime()
          }
          return normalized
        })
      }
    }

    async function initKds() {
      const { data: bizData } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .single()

      if (bizData) {
        // STRICT MODULE ENFORCEMENT GUARD
        const tenantProfile = getBusinessProfile(bizData.business_type)
        const effectiveHasKds = bizData.has_kds ?? tenantProfile.modules.hasKDS

        if (!effectiveHasKds) {
          alert('Kitchen Display System (KDS) module is disabled for this tenant.')
          router.push(`/${slug}`)
          return
        }

        businessId = bizData.id
        setBusiness(bizData)
        await fetchLatestTickets(bizData.id)
      } else {
        router.push('/')
        return
      }
      setLoading(false)
    }

    initKds()

    // Real-time Subscription Channel for kds_tickets
    const channel = supabase
      .channel(`kds-stream-${slug}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kds_tickets' }, (payload) => {
        if (!businessId) return

        if (payload.eventType === 'INSERT') {
          const newTicket = { ...(payload.new as KdsTicket), status: payload.new.status || 'pending' }
          if (newTicket.business_id === businessId && ['pending', 'preparing', 'ready'].includes(newTicket.status)) {
            setTickets(prev => {
              if (prev.some(o => o.id === newTicket.id)) return prev
              playChime()
              return [...prev, newTicket]
            })
          }
        } else if (payload.eventType === 'UPDATE') {
          const updated = { ...(payload.new as KdsTicket), status: payload.new.status || 'pending' }
          setTickets(prev => {
            if (['completed', 'cancelled'].includes(updated.status)) {
              return prev.filter(o => o.id !== updated.id)
            }
            const exists = prev.some(o => o.id === updated.id)
            if (exists) {
              return prev.map(o => o.id === updated.id ? updated : o)
            } else if (['pending', 'preparing', 'ready'].includes(updated.status)) {
              return [...prev, updated]
            }
            return prev
          })
        }
      })
      .subscribe()

    // Polling Fallback every 4 seconds
    const interval = setInterval(() => {
      if (businessId) {
        fetchLatestTickets(businessId)
      }
    }, 4000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [slug, router])

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    const { error } = await supabase
      .from('kds_tickets')
      .update({ status: newStatus })
      .eq('id', ticketId)

    if (!error) {
      if (['completed', 'cancelled'].includes(newStatus)) {
        setTickets(tickets.filter(o => o.id !== ticketId))
      } else {
        setTickets(tickets.map(o => o.id === ticketId ? { ...o, status: newStatus } : o))
      }
    } else {
      console.error('Supabase update error:', error)
      alert(`Failed to update ticket status: ${error.message}`)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-lg font-medium text-white">Loading Kitchen Display System...</div>
  }

  if (!business) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-lg text-red-400">Business Tenant Not Found</div>
  }

  const primaryColor = business.primary_color || '#000000'

  const pendingTickets = tickets.filter(t => t.status === 'pending')
  const preparingTickets = tickets.filter(t => t.status === 'preparing')
  const readyTickets = tickets.filter(t => t.status === 'ready')

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col font-sans select-none">
      
      {showSecurityGate && business && (
        <SecurityGateModal 
          businessId={business.id}
          requiredModule="kds"
          onAuthenticated={(staff) => {
            setAuthenticatedStaff(staff)
            setShowSecurityGate(false)
          }}
          onCancel={() => window.location.href = `/${slug}`}
        />
      )}

      <header className="px-6 py-4 shadow-md flex justify-between items-center border-b border-gray-800" style={{ backgroundColor: primaryColor }}>
        <div className="flex items-center space-x-4">
          <img 
            src={`/tenants/${slug}/logo-color.png`} 
            alt="Logo" 
            className="w-10 h-10 object-contain bg-white rounded-full p-1 shadow" 
            onError={(e)=>{(e.target as HTMLElement).style.display='none'}}
          />
          <div>
            <h1 className="text-xl font-extrabold tracking-wide">{business.name} — Kitchen Display System (KDS)</h1>
            <p className="text-xs opacity-90 uppercase tracking-widest">
              Live Auto-Sync Stream {authenticatedStaff ? `• Chef: ${authenticatedStaff.full_name}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setShowSecurityGate(true)}
            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition"
          >
            🔒 Switch PIN
          </button>
          <button 
            onClick={() => setIsMuted(!isMuted)} 
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              isMuted ? 'bg-red-500/30 text-red-300 border border-red-500/50' : 'bg-white/20 hover:bg-white/30 text-white'
            }`}
          >
            <span>{isMuted ? '🔇 Chime Muted' : '🔔 Chime Active'}</span>
          </button>
          <a href={`/${slug}`} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition backdrop-blur-sm">
            ← Back to Dashboard
          </a>
        </div>
      </header>

      <main className="p-6 flex-1 w-full max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Pending / New Tickets Column */}
          <div className="bg-gray-800/80 p-4 rounded-2xl border border-gray-700 flex flex-col h-[75vh]">
            <div className="flex justify-between items-center pb-3 border-b border-gray-700 mb-4">
              <h2 className="font-bold text-sm uppercase tracking-wider text-yellow-400">🕒 New / Pending</h2>
              <span className="bg-yellow-500/20 text-yellow-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {pendingTickets.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {pendingTickets.length > 0 ? pendingTickets.map(ticket => (
                <div key={ticket.id} className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3 shadow-md">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-black text-sm text-yellow-400">{ticket.kot_no || `#${ticket.id.slice(0, 8).toUpperCase()}`}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-yellow-900/50 text-yellow-300 rounded">
                      {ticket.service_type || 'DINE-IN'} {ticket.table_name ? `• Table ${ticket.table_name}` : ''}
                    </span>
                  </div>

                  {ticket.customer_name && (
                    <div className="text-[11px] text-gray-400 font-medium">Customer: <strong className="text-gray-200">{ticket.customer_name}</strong></div>
                  )}

                  <div className="space-y-1.5 border-t border-b border-gray-800 py-2">
                    {ticket.items?.map((item: any, idx: number) => (
                      <div key={idx} className="space-y-0.5 text-xs">
                        <div className="flex justify-between font-medium text-gray-200">
                          <span>🔲 {item.name} {item.selectedVariant ? `[${item.selectedVariant.name}]` : ''}</span>
                          <strong className="text-white text-sm">×{item.qty || item.quantity || 1}</strong>
                        </div>
                        {item.selectedAddons && item.selectedAddons.length > 0 && (
                          <div className="pl-4 text-[11px] text-blue-400">
                            {item.selectedAddons.map((ao: any, aIdx: number) => (
                              <div key={aIdx}>+ {ao.name}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => updateTicketStatus(ticket.id, 'preparing')}
                    className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-xs rounded-lg transition"
                  >
                    Start Preparing ➔
                  </button>
                </div>
              )) : (
                <div className="text-center text-gray-500 text-xs py-12">No pending kitchen tickets</div>
              )}
            </div>
          </div>

          {/* Preparing Column */}
          <div className="bg-gray-800/80 p-4 rounded-2xl border border-gray-700 flex flex-col h-[75vh]">
            <div className="flex justify-between items-center pb-3 border-b border-gray-700 mb-4">
              <h2 className="font-bold text-sm uppercase tracking-wider text-blue-400">🔥 Preparing</h2>
              <span className="bg-blue-500/20 text-blue-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {preparingTickets.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {preparingTickets.length > 0 ? preparingTickets.map(ticket => (
                <div key={ticket.id} className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3 shadow-md">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-black text-sm text-blue-400">{ticket.kot_no || `#${ticket.id.slice(0, 8).toUpperCase()}`}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded">
                      {ticket.service_type || 'DINE-IN'} {ticket.table_name ? `• Table ${ticket.table_name}` : ''}
                    </span>
                  </div>

                  <div className="space-y-1.5 border-t border-b border-gray-800 py-2">
                    {ticket.items?.map((item: any, idx: number) => (
                      <div key={idx} className="space-y-0.5 text-xs">
                        <div className="flex justify-between font-medium text-gray-200">
                          <span>🔲 {item.name} {item.selectedVariant ? `[${item.selectedVariant.name}]` : ''}</span>
                          <strong className="text-white text-sm">×{item.qty || item.quantity || 1}</strong>
                        </div>
                        {item.selectedAddons && item.selectedAddons.length > 0 && (
                          <div className="pl-4 text-[11px] text-blue-400">
                            {item.selectedAddons.map((ao: any, aIdx: number) => (
                              <div key={aIdx}>+ {ao.name}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => updateTicketStatus(ticket.id, 'ready')}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition"
                  >
                    Mark Ready ➔
                  </button>
                </div>
              )) : (
                <div className="text-center text-gray-500 text-xs py-12">No tickets in preparation</div>
              )}
            </div>
          </div>

          {/* Ready Column */}
          <div className="bg-gray-800/80 p-4 rounded-2xl border border-gray-700 flex flex-col h-[75vh]">
            <div className="flex justify-between items-center pb-3 border-b border-gray-700 mb-4">
              <h2 className="font-bold text-sm uppercase tracking-wider text-green-400">✅ Ready for Dispatch</h2>
              <span className="bg-green-500/20 text-green-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {readyTickets.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {readyTickets.length > 0 ? readyTickets.map(ticket => (
                <div key={ticket.id} className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3 shadow-md opacity-90">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-black text-sm text-green-400">{ticket.kot_no || `#${ticket.id.slice(0, 8).toUpperCase()}`}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-green-900/50 text-green-300 rounded">
                      {ticket.service_type || 'DINE-IN'} {ticket.table_name ? `• Table ${ticket.table_name}` : ''}
                    </span>
                  </div>

                  <div className="space-y-1.5 border-t border-b border-gray-800 py-2">
                    {ticket.items?.map((item: any, idx: number) => (
                      <div key={idx} className="text-xs flex justify-between font-medium text-gray-300">
                        <span>✓ {item.name}</span>
                        <span>×{item.qty || item.quantity || 1}</span>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => updateTicketStatus(ticket.id, 'completed')}
                    className="w-full py-2 bg-green-600 hover:bg-green-500 text-white font-bold text-xs rounded-lg transition"
                  >
                    Complete & Archive
                  </button>
                </div>
              )) : (
                <div className="text-center text-gray-500 text-xs py-12">No tickets ready for dispatch</div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}