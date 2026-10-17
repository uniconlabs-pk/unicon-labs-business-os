'use client'

import { useState, useEffect, use, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { getBusinessProfile } from '@/lib/businessProfiles'
import SecurityGateModal from '@/components/SecurityGateModal'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function DispatchManagerDashboard({ params }: PageProps) {
  const { slug } = use(params)
  const router = useRouter()

  const [business, setBusiness] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [deliveryOrders, setDeliveryOrders] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'pending' | 'out_for_delivery' | 'completed'>('pending')
  
  // Audio Notification States & Ref
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [selectedSound, setSelectedSound] = useState('/sounds/chime.mp4')
  const [availableSounds, setAvailableSounds] = useState<{ name: string; url: string; path?: string }[]>([
    { name: 'Default Local Chime (chime.mp4)', url: '/sounds/chime.mp4' }
  ])
  const [showSoundSettings, setShowSoundSettings] = useState(false)
  const [customUrlInput, setCustomUrlInput] = useState('')
  const [uploadingSound, setUploadingSound] = useState(false)
  const [audioUnlocked, setAudioUnlocked] = useState(false)

  // Fetch available sound files from Supabase 'chime-sounds' bucket
  const fetchChimeBucketSounds = async () => {
    try {
      const { data, error } = await supabase.storage.from('chime-sounds').list('', {
        limit: 50,
        sortBy: { column: 'created_at', order: 'desc' }
      })

      if (!error && data && data.length > 0) {
        const bucketFiles = data
          .filter(file => file.name && file.name !== '.emptyfolder')
          .map(file => {
            const { data: publicUrlData } = supabase.storage.from('chime-sounds').getPublicUrl(file.name)
            return {
              name: file.name,
              url: publicUrlData.publicUrl,
              path: file.name
            }
          })

        setAvailableSounds([
          { name: 'Default Local Chime (chime.mp4)', url: '/sounds/chime.mp4' },
          ...bucketFiles
        ])
      }
    } catch (err) {
      console.warn('Error fetching chime-sounds bucket:', err)
    }
  }

  // Hydrate audio settings from localStorage and fetch bucket sounds
  useEffect(() => {
    const savedMute = localStorage.getItem(`unicon_dispatch_muted_${slug}`)
    if (savedMute !== null) setIsMuted(savedMute === 'true')

    const savedVol = localStorage.getItem(`unicon_dispatch_volume_${slug}`)
    if (savedVol !== null) setVolume(parseFloat(savedVol))

    const savedSound = localStorage.getItem(`unicon_dispatch_sound_${slug}`)
    if (savedSound) setSelectedSound(savedSound)

    fetchChimeBucketSounds()
  }, [slug])

  // Initialize Audio Element ref
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(selectedSound)
    } else {
      audioRef.current.src = selectedSound
    }
    audioRef.current.volume = volume
    audioRef.current.load()
  }, [selectedSound, volume])

  // Unlock browser audio policy on first user interaction anywhere on page
  useEffect(() => {
    const unlockAudioContext = () => {
      if (!audioUnlocked && audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current?.pause()
          audioRef.current.currentTime = 0
          setAudioUnlocked(true)
          window.removeEventListener('click', unlockAudioContext)
          window.removeEventListener('keydown', unlockAudioContext)
        }).catch(() => {})
      }
    }

    window.addEventListener('click', unlockAudioContext)
    window.addEventListener('keydown', unlockAudioContext)
    return () => {
      window.removeEventListener('click', unlockAudioContext)
      window.removeEventListener('keydown', unlockAudioContext)
    }
  }, [audioUnlocked])

  const playChime = () => {
    if (isMuted) return
    const soundSrc = selectedSound || '/sounds/chime.mp4'
    const audio = new Audio(soundSrc)
    audio.volume = volume
    audio.currentTime = 0
    audio.play().catch(err => {
      console.log('Audio autoplay blocked, retrying with blob:', err)
      fetch(soundSrc)
        .then(res => res.blob())
        .then(blob => {
          const blobUrl = URL.createObjectURL(blob)
          const blobAudio = new Audio(blobUrl)
          blobAudio.volume = volume
          blobAudio.play().catch(bErr => console.log('Blob audio play failed:', bErr))
        })
        .catch(fErr => console.log('Blob fetch failed:', fErr))
    })
  }

  const testPlaySound = (soundUrl: string) => {
    if (!soundUrl) return
    
    if (soundUrl.startsWith('/')) {
      const testAudio = new Audio(soundUrl)
      testAudio.volume = volume
      testAudio.currentTime = 0
      testAudio.play().catch(err => {
        alert(`Could not play local sound: ${err.message}`)
      })
      return
    }

    const testAudio = new Audio()
    testAudio.volume = volume
    testAudio.src = soundUrl
    testAudio.load()
    
    testAudio.play().then(() => {}).catch(() => {
      fetch(soundUrl)
        .then(res => res.blob())
        .then(blob => {
          const blobUrl = URL.createObjectURL(blob)
          const blobAudio = new Audio(blobUrl)
          blobAudio.volume = volume
          blobAudio.play().catch(blobErr => {
            alert(`Could not play sound: ${blobErr.message}. Please ensure the file is a valid .mp3 or .mp4 audio file.`)
          })
        })
        .catch(fetchErr => {
          alert(`Could not load sound file: ${fetchErr.message}`)
        })
    })
  }

  const handleSoundChange = (url: string) => {
    setSelectedSound(url)
    testPlaySound(url)
  }

  const handleSaveChimeSettings = () => {
    localStorage.setItem(`unicon_dispatch_muted_${slug}`, String(isMuted))
    localStorage.setItem(`unicon_dispatch_volume_${slug}`, String(volume))
    localStorage.setItem(`unicon_dispatch_sound_${slug}`, selectedSound)
    setShowSoundSettings(false)
    alert('Chime settings saved successfully!')
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingSound(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `chime_${Date.now()}.${fileExt}`
      const fileMimeType = file.type || (fileExt === 'mp3' ? 'audio/mpeg' : 'audio/mp4')

      const { error: uploadError } = await supabase.storage
        .from('chime-sounds')
        .upload(fileName, file, { 
          cacheControl: '3600', 
          upsert: true,
          contentType: fileMimeType 
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('chime-sounds').getPublicUrl(fileName)
      const newFileUrl = urlData.publicUrl

      const prevSound = selectedSound
      if (prevSound && prevSound.includes('/chime-sounds/')) {
        const oldPath = prevSound.split('/chime-sounds/').pop()
        if (oldPath && !oldPath.startsWith('http')) {
          await supabase.storage.from('chime-sounds').remove([decodeURIComponent(oldPath)])
        }
      }

      await fetchChimeBucketSounds()
      handleSoundChange(newFileUrl)
      alert('Custom chime sound uploaded successfully to Supabase!')
    } catch (err: any) {
      alert(`Failed to upload chime file: ${err.message || err}`)
    } finally {
      setUploadingSound(false)
    }
  }

  // Security Gate & Staff Authentication States
  const [authenticatedStaff, setAuthenticatedStaff] = useState<any>(null)
  const [showSecurityGate, setShowSecurityGate] = useState(true)

  const [currentTime, setCurrentTime] = useState(new Date())
  const [inHouseRiders, setInHouseRiders] = useState<any[]>([])
  const [riderFormStates, setRiderFormStates] = useState<{ [orderId: string]: { type: 'inhouse' | 'thirdparty'; riderId: string; name: string; phone: string } }>({})

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const storedStaff = sessionStorage.getItem(`unicon_dispatch_staff_session_${slug}`)
    if (storedStaff) {
      try {
        const parsed = JSON.parse(storedStaff)
        setAuthenticatedStaff(parsed)
        setShowSecurityGate(false)
      } catch (e) {}
    }
  }, [slug])

  useEffect(() => {
    const cleanupSession = () => {
      if (authenticatedStaff?.id && business?.id) {
        const body = JSON.stringify({ businessId: business.id, staffId: authenticatedStaff.id })
        const blob = new Blob([body], { type: 'application/json' })
        navigator.sendBeacon('/api/auth/session-release', blob)
      }
    }

    window.addEventListener('beforeunload', cleanupSession)
    return () => {
      window.removeEventListener('beforeunload', cleanupSession)
    }
  }, [authenticatedStaff, business])

  useEffect(() => {
    async function initDispatch() {
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

      const tenantProfile = getBusinessProfile(biz.business_type)
      setProfile(tenantProfile)

      const { data: staffList, error: staffErr } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('business_id', biz.id)

      if (staffList && !staffErr) {
        const strictDeliveryRiders = staffList.filter((s: any) => {
          const r = (s.role || '').toLowerCase()
          const d = (s.department || '').toLowerCase()
          return r.includes('rider') || r.includes('delivery') || d.includes('delivery') || d.includes('logistic') || r.includes('driver')
        })
        setInHouseRiders(strictDeliveryRiders)
      }

      await fetchDeliveryOrders(biz.id)
      setLoading(false)
    }

    initDispatch()
  }, [slug, router])

  // Real-time subscription for live sync of delivery orders & chime trigger
  useEffect(() => {
    if (!business?.id) return

    const channel = supabase
      .channel(`dispatch-live-sync-${business.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `business_id=eq.${business.id}`,
        },
        (payload) => {
          const newOrder = payload.new as any
          if (newOrder.service_type === 'DELIVERY') {
            playChime()
          }
          fetchDeliveryOrders(business.id)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `business_id=eq.${business.id}`,
        },
        () => {
          fetchDeliveryOrders(business.id)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [business?.id])

  const fetchDeliveryOrders = async (bizId: string) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('business_id', bizId)
      .eq('service_type', 'DELIVERY')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setDeliveryOrders(prev => {
        const prevIds = new Set(prev.map(o => o.id))
        const hasNew = data.some(o => !prevIds.has(o.id) && (!o.dispatch_status || o.dispatch_status === 'pending'))
        if (prev.length > 0 && hasNew) {
          playChime()
        }
        return data
      })
    }
  }

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string, createdAt: string, formState?: { type: 'inhouse' | 'thirdparty'; riderId: string; name: string; phone: string }) => {
    const nowIso = new Date().toISOString()
    const updatePayload: any = { 
      dispatch_status: newStatus
    }

    if (newStatus === 'completed') {
      const startMs = new Date(createdAt).getTime()
      const endMs = new Date().getTime()
      const diffMs = Math.max(0, endMs - startMs)
      const totalSecs = Math.floor(diffMs / 1000)
      const mins = Math.floor(totalSecs / 60)
      const secs = totalSecs % 60

      updatePayload.completed_at = nowIso
      updatePayload.delivery_status = `${mins} min. ${secs} s.`
    }

    if (formState) {
      if (formState.type === 'inhouse' && formState.riderId && formState.riderId !== '') {
        const selectedStaff = inHouseRiders.find(r => r.id === formState.riderId)
        updatePayload.rider_id = formState.riderId
        updatePayload.rider_name = selectedStaff ? (selectedStaff.full_name || selectedStaff.name) : 'In-House Rider'
        updatePayload.rider_phone = formState.phone?.trim() || selectedStaff?.phone || null
      } else {
        updatePayload.rider_id = null
        updatePayload.rider_name = formState?.name?.trim() || 'Third-Party Partner'
        updatePayload.rider_phone = formState?.phone?.trim() || null
      }
    }

    if (newStatus === 'out_for_delivery') {
      updatePayload.settlement_status = 'PENDING_CASH'
    }

    const { error } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)

    if (error) {
      alert(`Failed to update dispatch status: ${error.message}`)
    } else {
      if (newStatus === 'out_for_delivery') {
        const targetOrder = deliveryOrders.find(o => o.id === orderId)
        if (targetOrder && targetOrder.customer_phone) {
          let cleanPhone = targetOrder.customer_phone.replace(/\D/g, '')
          if (cleanPhone.startsWith('0')) {
            cleanPhone = '92' + cleanPhone.substring(1)
          }
          
          let resolvedRiderName = 'Assigned Rider'
          if (formState?.type === 'inhouse' && formState.riderId) {
            const matchedStaff = inHouseRiders.find(r => r.id === formState.riderId)
            resolvedRiderName = matchedStaff ? (matchedStaff.full_name || matchedStaff.name) : 'In-House Rider'
          } else if (formState?.type === 'thirdparty') {
            resolvedRiderName = formState?.name?.trim() || 'Third-Party Partner'
          } else {
            resolvedRiderName = targetOrder.rider_name || 'Assigned Rider'
          }

          const riderPhoneInfo = formState?.phone || targetOrder.rider_phone || ''
          
          const itemsText = (targetOrder.items || [])
            .map((item: any) => `• ${item.qty}x ${item.name}${item.selectedVariant ? ` [${item.selectedVariant.name}]` : ''}`)
            .join('\n')

          const brandNameCaps = (business?.name || 'STORE').toUpperCase()
          const orderNumStr = targetOrder.order_number ? `KB-${String(targetOrder.order_number).padStart(6, '0')}` : 'DELIVERY'
          const totalAmtStr = `${currencySymbol} ${(Number(targetOrder.total_amount)).toLocaleString('en-US', { minimumFractionDigits: 2 })}`

          const bizTypeLower = (business?.business_type || '').toLowerCase()
          const isRestaurantOrFood = bizTypeLower.includes('restaurant') || bizTypeLower.includes('food') || bizTypeLower.includes('cafe') || bizTypeLower.includes('bakery') || bizTypeLower.includes('bite')
          const closingMessage = isRestaurantOrFood ? 'Thanks! ENJOY YOUR MEAL ⭐' : 'Thank you for shopping with us! ⭐'

          const whatsappMessage = 
`📦 *${brandNameCaps} - Order Dispatched!*

Hello *${targetOrder.customer_name || 'Customer'}*, your order has been dispatched and is on its way! 🛵

📋 *ORDER DETAILS:*
- Order #: *${orderNumStr}*
${itemsText}

💰 *TOTAL AMOUNT:* *${totalAmtStr}* (${targetOrder.payment_method || 'CASH ON DELIVERY'})

📍 *DELIVERY ADDRESS:* ${targetOrder.delivery_address || 'N/A'}

👤 *RIDER'S DETAIL:*
- Name: *${resolvedRiderName}*
${riderPhoneInfo ? `• Contact: *${riderPhoneInfo}*` : ''}

${closingMessage}`

          // Open WhatsApp in a dedicated named window target ('whatsapp_session')
          // If a WhatsApp tab is already open with that name, it focuses it; otherwise, it opens a brand new tab safely.
          const whatsappUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(whatsappMessage)}`
          window.open(whatsappUrl, 'whatsapp_session')
        }
      }
      fetchDeliveryOrders(business.id)
    }
  }

  const handleLockSession = async () => {
    if (authenticatedStaff?.id && business?.id) {
      try {
        await fetch('/api/auth/session-release', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: business.id, staffId: authenticatedStaff.id })
        })
      } catch (err) {}
    }
    sessionStorage.removeItem(`unicon_dispatch_staff_session_${slug}`)
    setAuthenticatedStaff(null)
    setShowSecurityGate(true)
  }

  const currencySymbol = business?.currency_symbol || 'Rs.'

  if (loading || !profile) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center font-bold text-gray-700">Loading Dispatch Manager...</div>
  }

  const filteredOrders = deliveryOrders.filter(ord => {
    const status = ord.dispatch_status || 'pending'
    if (activeTab === 'pending') return status === 'pending' || !ord.dispatch_status
    if (activeTab === 'out_for_delivery') return status === 'out_for_delivery'
    if (activeTab === 'completed') return status === 'completed' || status === 'delivered'
    return true
  })

  const getOrderAgeString = (createdAt: string) => {
    const diffMs = currentTime.getTime() - new Date(createdAt).getTime()
    if (diffMs < 0) return 'Just now'
    const totalSecs = Math.floor(diffMs / 1000)
    const mins = Math.floor(totalSecs / 60)
    const secs = totalSecs % 60
    if (mins === 0) return `${secs} s. Ago`
    return `${mins} min. ${secs} s. Ago`
  }

  const getFulfillmentDurationString = (ord: any) => {
    if (ord.delivery_status && ord.delivery_status !== 'none' && ord.delivery_status.includes('min.')) {
      return ord.delivery_status
    }
    const startMs = new Date(ord.created_at).getTime()
    const endMs = ord.completed_at ? new Date(ord.completed_at).getTime() : new Date().getTime()
    const diffMs = Math.max(0, endMs - startMs)
    const totalSecs = Math.floor(diffMs / 1000)
    const mins = Math.floor(totalSecs / 60)
    const secs = totalSecs % 60
    return `${mins} min. ${secs} s.`
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 flex flex-col font-sans select-none h-screen overflow-hidden text-xs">
      
      {showSecurityGate && business && (
        <SecurityGateModal 
          businessId={business.id}
          requiredModule="pos"
          onAuthenticated={(staff) => {
            setAuthenticatedStaff(staff)
            sessionStorage.setItem(`unicon_dispatch_staff_session_${slug}`, JSON.stringify(staff))
            setShowSecurityGate(false)
          }}
          onCancel={() => router.push(`/${slug}`)}
        />
      )}

      {/* HEADER */}
      <header className="bg-slate-900 text-white border-b border-slate-800 px-6 py-4 flex justify-between items-center shrink-0 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-inner">
            📦
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wide uppercase text-white flex items-center space-x-1.5">
              <span>{business?.name || 'STORE'}</span>
              <span className="text-gray-500">•</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-blue-100 text-blue-800">
                Dispatch & Fulfillment Queue
              </span>
            </h1>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Tenant Slug: {slug}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Audio Chime Controls */}
          <div className="relative">
            <button
              onClick={() => setShowSoundSettings(!showSoundSettings)}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition flex items-center space-x-1 cursor-pointer ${
                isMuted ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700'
              }`}
              title="Chime Notification Settings"
            >
              <span>{isMuted ? '🔇 Muted' : '🔔 Chime'}</span>
              <span className="text-[9px] opacity-70">({Math.round(volume * 100)}%)</span>
            </button>

            {/* Sound Settings Popover */}
            {showSoundSettings && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 z-50 text-slate-100 font-sans space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="font-black text-xs uppercase tracking-wider text-blue-400">🔊 Chime Settings</span>
                  <button onClick={() => setShowSoundSettings(false)} className="text-gray-400 hover:text-white text-xs font-bold">✕</button>
                </div>

                {/* Mute Toggle */}
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold">Mute Chime</span>
                  <button
                    onClick={() => {
                      const nextMuted = !isMuted
                      setIsMuted(nextMuted)
                    }}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase cursor-pointer ${
                      isMuted ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {isMuted ? 'Muted' : 'Active'}
                  </button>
                </div>

                {/* Volume Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span>Volume</span>
                    <span className="font-mono text-blue-400">{Math.round(volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={e => {
                      const val = parseFloat(e.target.value)
                      setVolume(val)
                      if (audioRef.current) audioRef.current.volume = val
                    }}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                {/* Sound File Selector from Bucket */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-gray-300">Select Chime Sound (.mp4 / .mp3)</span>
                  <select
                    value={selectedSound}
                    onChange={e => handleSoundChange(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-blue-500 cursor-pointer truncate"
                  >
                    {availableSounds.map((snd, idx) => (
                      <option key={idx} value={snd.url}>
                        {snd.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Test Sound Button */}
                <button
                  type="button"
                  onClick={() => testPlaySound(selectedSound)}
                  className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-[10px] uppercase tracking-wider transition cursor-pointer flex items-center justify-center space-x-1"
                >
                  <span>▶ Test Selected Chime</span>
                </button>

                {/* Upload to Supabase Chime-Sounds Bucket */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800">
                  <span className="text-[10px] font-bold text-gray-400">Upload Chime to Supabase Bucket</span>
                  <div className="flex space-x-1.5">
                    <input
                      type="file"
                      accept="audio/mp4,audio/mpeg,audio/mp3,video/mp4"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="custom-audio-upload"
                      disabled={uploadingSound}
                    />
                    <label
                      htmlFor="custom-audio-upload"
                      className={`flex-1 text-center py-1.5 rounded-xl text-[10px] font-bold border border-slate-700 cursor-pointer truncate px-2 ${
                        uploadingSound ? 'bg-gray-700 text-gray-400 cursor-wait' : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                    >
                      {uploadingSound ? 'Uploading...' : '📁 Upload File (.mp3/.mp4)'}
                    </label>
                  </div>
                  <div className="flex space-x-1 pt-1">
                    <input
                      type="text"
                      placeholder="Paste sound file URL..."
                      value={customUrlInput}
                      onChange={e => setCustomUrlInput(e.target.value)}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customUrlInput.trim()) {
                          handleSoundChange(customUrlInput.trim())
                          setCustomUrlInput('')
                        }
                      }}
                      className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                    >
                      Link
                    </button>
                  </div>
                </div>

                {/* SAVE CHIME SETTINGS BUTTON */}
                <button
                  type="button"
                  onClick={handleSaveChimeSettings}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs uppercase tracking-wider transition cursor-pointer mt-2 shadow-md"
                >
                  💾 Save Chime Settings
                </button>
              </div>
            )}
          </div>

          <div className="text-right font-mono">
            <div className="text-xs font-black text-white">{currentTime.toLocaleTimeString('en-US', { hour12: false })}</div>
            <div className="text-[9px] text-blue-400 uppercase font-bold">Staff: {authenticatedStaff?.full_name || 'Online'}</div>
          </div>
          <button 
            onClick={handleLockSession}
            className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition text-[10px] font-bold cursor-pointer"
            title="Lock / Sign Out Staff"
          >
            🔒 Lock
          </button>
        </div>
      </header>

      {/* SUB-HEADER TABS */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex space-x-2 shrink-0">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-xl font-black uppercase tracking-wide transition text-xs cursor-pointer ${
            activeTab === 'pending' ? 'bg-slate-900 text-white shadow-2xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          ⏳ Ready for Packing ({deliveryOrders.filter(o => !o.dispatch_status || o.dispatch_status === 'pending').length})
        </button>
        <button
          onClick={() => setActiveTab('out_for_delivery')}
          className={`px-4 py-2 rounded-xl font-black uppercase tracking-wide transition text-xs cursor-pointer ${
            activeTab === 'out_for_delivery' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          🛵 Out for Delivery ({deliveryOrders.filter(o => o.dispatch_status === 'out_for_delivery').length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-xl font-black uppercase tracking-wide transition text-xs cursor-pointer ${
            activeTab === 'completed' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          ✅ Delivered History ({deliveryOrders.filter(o => o.dispatch_status === 'completed' || o.dispatch_status === 'delivered').length})
        </button>
      </div>

      {/* MAIN ORDERS GRID */}
      <div className="flex-1 p-6 overflow-y-auto">
        {filteredOrders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {filteredOrders.map(ord => {
              const currentStatus = ord.dispatch_status || 'pending'
              const isCompletedTab = activeTab === 'completed' || currentStatus === 'completed' || currentStatus === 'delivered'
              
              const currentForm = riderFormStates[ord.id] || {
                type: 'inhouse',
                riderId: inHouseRiders[0]?.id || '',
                name: ord.rider_name || '',
                phone: ord.rider_phone || ''
              }

              return (
                <div key={ord.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs">
                  
                  {/* ZONE 1: TOP HEADER BLOCK */}
                  <div className="px-3 py-2.5 border-b border-amber-300/60 bg-gradient-to-tr from-amber-400 via-yellow-300 to-orange-400 shadow-inner font-mono font-bold text-slate-950 text-[11px] space-y-0.5">
                    <div className="flex">
                      <span className="w-28 font-bold">Order Number</span>
                      <span className="mr-1">:</span>
                      <span className="font-black text-slate-950">{ord.order_number ? `KB-${String(ord.order_number).padStart(6, '0')}` : 'DELIVERY'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-28 font-bold">Order Punched</span>
                      <span className="mr-1">:</span>
                      <span>{new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })} ({new Date(ord.created_at).toLocaleDateString('en-GB')})</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-28 font-bold">Delivered in</span>
                      <span className="mr-1">:</span>
                      <span className="font-black text-slate-950">
                        {isCompletedTab ? getFulfillmentDurationString(ord) : getOrderAgeString(ord.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* ZONE 2: CUSTOMER METADATA BLOCK */}
                  <div className="px-3 py-2 bg-slate-50/70 border-b border-gray-200 font-sans text-[11px] space-y-1">
                    <div className="flex items-start">
                      <span className="w-24 font-bold text-gray-700 shrink-0">Customer</span>
                      <span className="mr-1 text-gray-700">:</span>
                      <span className="font-extrabold text-gray-900 truncate">{ord.customer_name || 'Customer'} / {ord.customer_phone || 'No Phone'}</span>
                    </div>
                    <div className="flex items-start">
                      <span className="w-24 font-bold text-gray-700 shrink-0">Delivery Address</span>
                      <span className="mr-1 text-gray-700">:</span>
                      <span className="font-medium text-gray-800 line-clamp-2">{ord.delivery_address || 'No address provided'}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-24 font-bold text-gray-700 shrink-0">Payment Mode</span>
                      <span className="mr-1 text-gray-700">:</span>
                      <span className="font-black text-emerald-700 uppercase tracking-wide">{ord.payment_method || 'CASH ON DELIVERY'}</span>
                    </div>
                  </div>

                  {/* ZONE 3: ORDER ITEMS SECTION */}
                  <div className="p-3 space-y-2 flex-1 flex flex-col">
                    <div className="font-black text-[11px] text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-1">
                      ORDER ITEMS:
                    </div>

                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                      {(ord.items || []).map((item: any, iIdx: number) => (
                        <div key={iIdx} className="flex justify-between text-gray-900 font-semibold text-[11px]">
                          <span className="truncate pr-1">{item.qty}x {item.name} {item.selectedVariant ? `[${item.selectedVariant.name}]` : ''}</span>
                          <span className="font-mono text-gray-700 shrink-0">{(item.finalUnitPrice * item.qty).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-200 pt-1.5 mt-auto space-y-1 font-semibold text-[11px]">
                      <div className="flex justify-between text-gray-700">
                        <span>Subtotal :</span>
                        <span className="font-mono">{(Number(ord.subtotal || ord.total_amount)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                      {Number(ord.delivery_charges) > 0 && (
                        <div className="flex justify-between text-gray-700">
                          <span>Delivery Charges :</span>
                          <span className="font-mono">+ {(Number(ord.delivery_charges)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {Number(ord.service_charges) > 0 && (
                        <div className="flex justify-between text-gray-700">
                          <span>Service Charges :</span>
                          <span className="font-mono">+ {(Number(ord.service_charges)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {Number(ord.gst_amount) > 0 && (
                        <div className="flex justify-between text-gray-700">
                          <span>GST Charges :</span>
                          <span className="font-mono">+ {(Number(ord.gst_amount)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {Number(ord.discount_amount) > 0 && (
                        <div className="flex justify-between text-rose-600">
                          <span>Discount :</span>
                          <span className="font-mono">- {(Number(ord.discount_amount)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                    </div>

                    {/* ZONE 4: TOTAL AMOUNT BANNER */}
                    <div className="bg-slate-700 text-white px-3 py-2 rounded-lg flex justify-between items-center font-black text-xs uppercase shadow-xs">
                      <span>TOTAL AMOUNT</span>
                      <span className="font-mono text-sm">{currencySymbol} {(Number(ord.total_amount)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>

                    {/* ZONE 5: SPECIAL INSTRUCTION NOTE BOX */}
                    <div className="bg-slate-900 rounded-lg overflow-hidden border border-slate-800 shadow-xs">
                      <div className="bg-slate-900 text-white text-[10px] font-black uppercase px-2.5 py-1 tracking-wider border-b border-slate-800">
                        SPECIAL INSTRUCTION NOTE:
                      </div>
                      <div className="bg-white p-2 min-h-9 text-[11px] text-gray-800 font-medium">
                        {ord.delivery_note || ord.customer_note || <span className="text-gray-300 italic">No special instructions provided.</span>}
                      </div>
                    </div>

                    {/* ZONE 6: ASSIGNED RIDER & ACTION FOOTER */}
                    <div className="pt-2 border-t border-gray-200 space-y-2 mt-2">
                      {currentStatus === 'pending' || !ord.dispatch_status ? (
                        <div className="space-y-2 bg-blue-50/50 p-2.5 rounded-xl border border-blue-200">
                          <div className="flex justify-between items-center text-[10px] font-black text-blue-900 uppercase">
                            <span>Assign Rider / Partner</span>
                            <div className="flex space-x-1 bg-white p-0.5 rounded border border-blue-300">
                              <button
                                type="button"
                                onClick={() => setRiderFormStates({ ...riderFormStates, [ord.id]: { ...currentForm, type: 'inhouse' } })}
                                className={`px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer ${currentForm.type === 'inhouse' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
                              >
                                In-House
                              </button>
                              <button
                                type="button"
                                onClick={() => setRiderFormStates({ ...riderFormStates, [ord.id]: { ...currentForm, type: 'thirdparty' } })}
                                className={`px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer ${currentForm.type === 'thirdparty' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
                              >
                                3rd Party
                              </button>
                            </div>
                          </div>

                          {currentForm.type === 'inhouse' ? (
                            <div className="grid grid-cols-2 gap-1.5">
                              <select
                                value={currentForm.riderId}
                                onChange={e => {
                                  const selectedId = e.target.value
                                  const matchedStaff = inHouseRiders.find(r => r.id === selectedId)
                                  setRiderFormStates({
                                    ...riderFormStates,
                                    [ord.id]: {
                                      ...currentForm,
                                      riderId: selectedId,
                                      phone: matchedStaff?.phone || currentForm.phone
                                    }
                                  })
                                }}
                                className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs font-bold text-gray-900 focus:outline-none focus:border-blue-600 truncate cursor-pointer"
                              >
                                <option value="">-- Select Rider --</option>
                                {inHouseRiders.map(r => (
                                  <option key={r.id} value={r.id}>
                                    {r.full_name || r.name}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                placeholder="Mobile Number..."
                                value={currentForm.phone}
                                onChange={e => setRiderFormStates({ ...riderFormStates, [ord.id]: { ...currentForm, phone: e.target.value } })}
                                className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs font-mono text-gray-900 focus:outline-none focus:border-blue-600"
                              />
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-1.5">
                              <input
                                type="text"
                                placeholder="Rider Name..."
                                value={currentForm.name}
                                onChange={e => setRiderFormStates({ ...riderFormStates, [ord.id]: { ...currentForm, name: e.target.value } })}
                                className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs font-medium text-gray-900 focus:outline-none focus:border-blue-600"
                              />
                              <input
                                type="text"
                                placeholder="Phone Number..."
                                value={currentForm.phone}
                                onChange={e => setRiderFormStates({ ...riderFormStates, [ord.id]: { ...currentForm, phone: e.target.value } })}
                                className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs font-mono text-gray-900 focus:outline-none focus:border-blue-600"
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wide">
                            ASSIGNED RIDER:
                          </div>
                          <div className="font-black text-gray-900 text-xs">
                            {ord.rider_name || 'Assigned Rider'}
                          </div>
                          {ord.rider_phone && (
                            <div className="flex items-center space-x-1 text-rose-600 font-mono font-bold text-xs">
                              <span>📞</span>
                              <span>{ord.rider_phone}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="pt-1">
                        {currentStatus === 'pending' || !ord.dispatch_status ? (
                          <button
                            onClick={() => handleUpdateOrderStatus(ord.id, 'out_for_delivery', ord.created_at, currentForm)}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs uppercase tracking-wide shadow-2xs transition cursor-pointer"
                          >
                            🛵 Assign & Dispatch
                          </button>
                        ) : currentStatus === 'out_for_delivery' ? (
                          <button
                            onClick={() => handleUpdateOrderStatus(ord.id, 'completed', ord.created_at)}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs uppercase tracking-wide shadow-2xs transition cursor-pointer"
                          >
                            ✓ Mark Delivered
                          </button>
                        ) : (
                          <div className="w-full py-2.5 bg-emerald-100 text-emerald-800 font-black rounded-xl text-xs uppercase tracking-widest text-center border border-emerald-300">
                            COMPLETED / SETTLED
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
            <span className="text-3xl">📭</span>
            <p className="text-xs font-bold uppercase">No delivery orders found in this fulfillment queue.</p>
          </div>
        )}
      </div>

    </div>
  )
}