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

export default function SimpleTableManagement({ params }: PageProps) {
  const { slug } = use(params)
  const router = useRouter()

  const [business, setBusiness] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const [tables, setTables] = useState<any[]>([])
  const [zones, setZones] = useState<string[]>([])
  const [activeZone, setActiveZone] = useState('ALL')
  const [reservations, setReservations] = useState<any[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())

  // Report Filter States
  const [filterSearch, setFilterSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterDate, setFilterDate] = useState('')

  // Drag and Drop Zone State
  const [draggedZone, setDraggedZone] = useState<string | null>(null)

  // Drag and Drop Table State
  const [draggedTableId, setDraggedTableId] = useState<string | null>(null)

  // Table Modal State
  const [showModal, setShowModal] = useState(false)
  const [editingTable, setEditingTable] = useState<any>(null)
  const [tableName, setTableName] = useState('')
  const [tableZone, setTableZone] = useState('MAIN HALL')
  const [tableSeats, setTableSeats] = useState('4')
  const [tableStatus, setTableStatus] = useState('available')

  // Zone Management Modal State
  const [showZoneModal, setShowZoneModal] = useState(false)
  const [newZoneName, setNewZoneName] = useState('')
  const [editingZoneOldName, setEditingZoneOldName] = useState<string | null>(null)
  const [editingZoneNewName, setEditingZoneNewName] = useState('')

  // Reservation Modal State
  const [showResModal, setShowResModal] = useState(false)
  const [resCustomerName, setResCustomerName] = useState('')
  const [resCustomerPhone, setResCustomerPhone] = useState('')
  const [resPartySize, setResPartySize] = useState('4')
  const [resSelectedZone, setResSelectedZone] = useState('')
  const [resTableId, setResTableId] = useState('')
  const [resStartTime, setResStartTime] = useState('')
  const [resEndTime, setResEndTime] = useState('')

  // Real-time clock ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const rawSession = localStorage.getItem(`tenant_session_${slug}`)
    if (!rawSession) {
      router.push(`/${slug}/login`)
      return
    }

    async function loadData() {
      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .single()

      if (!biz) {
        router.push('/')
        return
      }

      setBusiness(biz)
      const tenantProfile = getBusinessProfile(biz.business_type)
      setProfile(tenantProfile)

      const { data: tableData } = await supabase
        .from('tables')
        .select('*')
        .eq('business_id', biz.id)
        .order('sort_order', { ascending: true })

      let currentZones: string[] = []
      if (tableData && tableData.length > 0) {
        setTables(tableData)
        const fetchedZones = Array.from(new Set(tableData.map((t: any) => t.zone_name || t.zone || 'MAIN HALL'))) as string[]
        
        if (biz.zone_arrangement && Array.isArray(biz.zone_arrangement) && biz.zone_arrangement.length > 0) {
          const savedArrangement = biz.zone_arrangement.filter((z: string) => fetchedZones.includes(z))
          const missingZones = fetchedZones.filter((z: string) => !savedArrangement.includes(z))
          currentZones = [...savedArrangement, ...missingZones]
          setZones(currentZones)
        } else {
          currentZones = fetchedZones
          setZones(fetchedZones)
        }
      } else {
        const defaultTables = [
          { id: '1', table_number: 'T-01', zone_name: 'MAIN HALL', status: 'available', capacity: 4, sort_order: 0 },
          { id: '2', table_number: 'T-02', zone_name: 'MAIN HALL', status: 'available', capacity: 4, sort_order: 1 },
          { id: '3', table_number: 'VIP-01', zone_name: 'VIP HALL', status: 'reserved', capacity: 6, sort_order: 2 },
        ]
        setTables(defaultTables)
        currentZones = ['MAIN HALL', 'VIP HALL']
        setZones(currentZones)
      }

      if (currentZones.length > 0) {
        setResSelectedZone(currentZones[0])
      }

      const { data: resData } = await supabase
        .from('reservations')
        .select('*')
        .eq('business_id', biz.id)
        .order('created_at', { ascending: false })

      if (resData) {
        setReservations(resData)
      }

      setLoading(false)
    }

    loadData()
  }, [slug, router])

  // Real-time Expiry Handler Effect
  useEffect(() => {
    if (!business || reservations.length === 0) return

    const activeRes = reservations.filter(r => r.status === 'RESERVED')
    activeRes.forEach(async (res) => {
      const endTime = new Date(res.end_time).getTime()
      if (currentTime.getTime() >= endTime) {
        await supabase.from('reservations').update({ status: 'EXPIRED' }).eq('id', res.id)
        if (res.table_id) {
          await supabase.from('tables').update({ status: 'available' }).eq('id', res.table_id)
          setTables(prev => prev.map(t => t.id === res.table_id ? { ...t, status: 'available' } : t))
        }
        setReservations(prev => prev.map(r => r.id === res.id ? { ...r, status: 'EXPIRED' } : r))
      }
    })
  }, [currentTime, reservations, business])

  const persistZoneArrangement = async (newZones: string[]) => {
    if (!business) return
    setZones(newZones)
    await supabase
      .from('businesses')
      .update({ zone_arrangement: newZones })
      .eq('id', business.id)
  }

  const handleZoneDragStart = (e: React.DragEvent, zone: string) => {
    setDraggedZone(zone)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleZoneDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleZoneDrop = async (e: React.DragEvent, targetZone: string) => {
    e.preventDefault()
    if (!draggedZone || draggedZone === targetZone) return

    const draggedIndex = zones.indexOf(draggedZone)
    const targetIndex = zones.indexOf(targetZone)
    if (draggedIndex === -1 || targetIndex === -1) return

    const updatedZones = [...zones]
    const [movedZone] = updatedZones.splice(draggedIndex, 1)
    updatedZones.splice(targetIndex, 0, movedZone)

    setDraggedZone(null)
    await persistZoneArrangement(updatedZones)
  }

  // Table Tile Drag & Drop Handler for Permanent Sequence Lock
  const handleTableDragStart = (e: React.DragEvent, tableId: string) => {
    setDraggedTableId(tableId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleTableDrop = async (e: React.DragEvent, targetTableId: string, targetZone: string) => {
    e.preventDefault()
    if (!draggedTableId || draggedTableId === targetTableId) return

    const zoneTables = tables.filter(t => (t.zone_name || t.zone || 'MAIN HALL').toUpperCase() === targetZone.toUpperCase())
    const draggedIndex = zoneTables.findIndex(t => t.id === draggedTableId)
    const targetIndex = zoneTables.findIndex(t => t.id === targetTableId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const reorderedZoneTables = [...zoneTables]
    const [movedTable] = reorderedZoneTables.splice(draggedIndex, 1)
    reorderedZoneTables.splice(targetIndex, 0, movedTable)

    const updatedZoneTablesWithOrder = reorderedZoneTables.map((t, idx) => ({
      ...t,
      sort_order: idx,
      zone_name: targetZone.toUpperCase()
    }))

    const otherTables = tables.filter(t => (t.zone_name || t.zone || 'MAIN HALL').toUpperCase() !== targetZone.toUpperCase())
    const newFullTablesList = [...otherTables, ...updatedZoneTablesWithOrder]

    setTables(newFullTablesList)
    setDraggedTableId(null)

    for (const t of updatedZoneTablesWithOrder) {
      await supabase.from('tables').update({ 
        sort_order: t.sort_order,
        zone_name: t.zone_name
      }).eq('id', t.id)
    }
  }

  const handleSaveReservation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resCustomerName || !resCustomerPhone || !resTableId || !resStartTime || !resEndTime) {
      alert('Please fill out all reservation fields.')
      return
    }

    const rawSession = localStorage.getItem(`tenant_session_${slug}`)
    let merchantName = 'Manager / Staff'
    try {
      const sessionObj = JSON.parse(rawSession || '{}')
      merchantName = sessionObj.name || sessionObj.email || 'Manager'
    } catch (e) {}

    const payload = {
      business_id: business.id,
      table_id: resTableId,
      customer_name: resCustomerName.trim(),
      customer_phone: resCustomerPhone.trim(),
      party_size: parseInt(resPartySize) || 2,
      start_time: new Date(resStartTime).toISOString(),
      end_time: new Date(resEndTime).toISOString(),
      status: 'RESERVED',
      reserved_by: merchantName
    }

    const { data, error } = await supabase.from('reservations').insert([payload]).select().single()
    if (!error && data) {
      setReservations([data, ...reservations])
      await supabase.from('tables').update({ status: 'reserved' }).eq('id', resTableId)
      setTables(tables.map(t => t.id === resTableId ? { ...t, status: 'reserved' } : t))
      setShowResModal(false)
      setResCustomerName('')
      setResCustomerPhone('')
      setResStartTime('')
      setResEndTime('')
    } else {
      alert(`Failed to create reservation: ${error?.message || 'Unknown error'}`)
    }
  }

  const handleMarkAttended = async (res: any) => {
    await supabase.from('reservations').update({ status: 'ATTENDED' }).eq('id', res.id)
    if (res.table_id) {
      await supabase.from('tables').update({ status: 'occupied' }).eq('id', res.table_id)
      setTables(tables.map(t => t.id === res.table_id ? { ...t, status: 'occupied' } : t))
    }
    setReservations(reservations.map(r => r.id === res.id ? { ...r, status: 'ATTENDED' } : r))
  }

  const handleCancelReservation = async (res: any) => {
    if (!confirm('Cancel this booking?')) return
    await supabase.from('reservations').update({ status: 'CANCELLED' }).eq('id', res.id)
    if (res.table_id) {
      await supabase.from('tables').update({ status: 'available' }).eq('id', res.table_id)
      setTables(tables.map(t => t.id === res.table_id ? { ...t, status: 'available' } : t))
    }
    setReservations(reservations.map(r => r.id === res.id ? { ...r, status: 'CANCELLED' } : r))
  }

  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tableName) return

    const zoneTablesCount = tables.filter(t => (t.zone_name || t.zone || 'MAIN HALL').toUpperCase() === tableZone.toUpperCase()).length

    const payload = {
      business_id: business.id,
      table_number: tableName.toUpperCase(),
      zone_name: tableZone.toUpperCase(),
      capacity: parseInt(tableSeats) || 4,
      status: tableStatus,
      sort_order: zoneTablesCount
    }

    if (editingTable) {
      const { data, error } = await supabase.from('tables').update(payload).eq('id', editingTable.id).select().single()
      if (!error && data) {
        setTables(tables.map(t => t.id === editingTable.id ? data : t))
        closeModal()
      } else {
        alert(`Error updating table: ${error?.message || 'Unknown error'}`)
      }
    } else {
      const { data, error } = await supabase.from('tables').insert([payload]).select().single()
      if (!error && data) {
        setTables([...tables, data])
        const targetZ = tableZone.toUpperCase()
        if (!zones.includes(targetZ)) {
          const updatedZones = [...zones, targetZ]
          await persistZoneArrangement(updatedZones)
        }
        closeModal()
      } else {
        const mockNew = { id: Math.random().toString(), ...payload }
        setTables([...tables, mockNew])
        const targetZ = tableZone.toUpperCase()
        if (!zones.includes(targetZ)) {
          const updatedZones = [...zones, targetZ]
          await persistZoneArrangement(updatedZones)
        }
        closeModal()
      }
    }
  }

  const handleDeleteTable = async (id: string) => {
    if (!confirm('Are you sure you want to delete this table?')) return
    await supabase.from('tables').delete().eq('id', id)
    setTables(tables.filter(t => t.id !== id))
  }

  const handleAddZone = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newZoneName.trim()) return
    const formatted = newZoneName.trim().toUpperCase()
    if (zones.includes(formatted)) {
      alert('This zone already exists.')
      return
    }
    const updatedZones = [...zones, formatted]
    await persistZoneArrangement(updatedZones)
    setNewZoneName('')
  }

  const handleUpdateZone = async (oldName: string) => {
    if (!editingZoneNewName.trim()) return
    const updated = editingZoneNewName.trim().toUpperCase()

    const updatedTables = tables.map(t => (t.zone_name || t.zone || 'MAIN HALL') === oldName ? { ...t, zone_name: updated } : t)
    setTables(updatedTables)

    await supabase.from('tables').update({ zone_name: updated }).eq('business_id', business.id).eq('zone_name', oldName)

    const updatedZones = zones.map(z => z === oldName ? updated : z)
    await persistZoneArrangement(updatedZones)

    if (activeZone === oldName) setActiveZone(updated)
    setEditingZoneOldName(null)
    setEditingZoneNewName('')
  }

  const handleDeleteZone = async (zoneToDelete: string) => {
    if (!confirm(`Delete zone "${zoneToDelete}" and all tables inside it?`)) return

    await supabase.from('tables').delete().eq('business_id', business.id).eq('zone_name', zoneToDelete)
    setTables(tables.filter(t => (t.zone_name || t.zone || 'MAIN HALL') !== zoneToDelete))
    
    const updatedZones = zones.filter(z => z !== zoneToDelete)
    await persistZoneArrangement(updatedZones)

    if (activeZone === zoneToDelete) setActiveZone('ALL')
  }

  const openEditModal = (table: any) => {
    setEditingTable(table)
    setTableName(table.table_number || table.name || '')
    setTableZone(table.zone_name || table.zone || 'MAIN HALL')
    setTableSeats(table.capacity || table.seats || 4)
    setTableStatus(table.status || 'available')
    setShowModal(true)
  }

  const closeModal = () => {
    setEditingTable(null)
    setTableName('')
    setTableZone('MAIN HALL')
    setTableSeats('4')
    setTableStatus('available')
    setShowModal(false)
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-bold text-gray-600 text-xs">
        Loading Table Management...
      </div>
    )
  }

  const freeCount = tables.filter(t => t.status === 'available').length
  const occupiedCount = tables.filter(t => t.status === 'occupied').length
  const reservedCount = tables.filter(t => t.status === 'reserved').length
  const activeReservations = reservations.filter(r => r.status === 'RESERVED')

  const resAvailableTables = tables.filter(t => {
    const matchesZone = (t.zone_name || t.zone || 'MAIN HALL').toUpperCase() === resSelectedZone.toUpperCase()
    const isAvailable = t.status === 'available'
    return matchesZone && isAvailable
  })

  const filteredReservations = reservations.filter(res => {
    const searchLower = filterSearch.toLowerCase()
    const matchesSearch = !filterSearch || 
      res.customer_name?.toLowerCase().includes(searchLower) || 
      res.customer_phone?.includes(filterSearch)

    const matchesStatus = filterStatus === 'ALL' || res.status === filterStatus
    const matchesDate = !filterDate || new Date(res.start_time).toISOString().split('T')[0] === filterDate

    return matchesSearch && matchesStatus && matchesDate
  })

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 flex flex-col font-sans">
      
      {/* HEADER BAR */}
      <header className="bg-white border-b border-gray-200 px-8 py-5 flex justify-between items-center shadow-xs">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-xl shadow-inner">
            🪑
          </div>
          <div>
            <h1 className="text-base font-black uppercase text-gray-900 tracking-wide flex items-center space-x-2">
              <span>Table & Zone Management</span>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase">
                {profile.displayName}
              </span>
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              Tenant: <span className="font-bold text-gray-900">{business?.name}</span> | Slug: <span className="font-mono font-bold">{slug}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button 
            onClick={() => {
              if (zones.length > 0) setResSelectedZone(zones[0])
              setShowResModal(true)
            }}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1"
          >
            <span>📅 + Reserve Table</span>
          </button>
          <button 
            onClick={() => setShowZoneModal(true)}
            className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1"
          >
            <span>📍 Manage Zones</span>
          </button>
          <button 
            onClick={() => { closeModal(); setShowModal(true); }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1"
          >
            <span>+ Add New Table</span>
          </button>
          <a 
            href={`/${slug}`} 
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold transition flex items-center space-x-1"
          >
            <span>⬅️</span>
            <span>Back</span>
          </a>
        </div>
      </header>

      {/* MAIN CONTENT WORKSPACE */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
        
        {/* STATS SUMMARY BAR */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
            <div className="text-[10px] font-extrabold text-gray-400 uppercase">Total Tables</div>
            <div className="text-xl font-black font-mono text-gray-900 mt-1">{tables.length}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
            <div className="text-[10px] font-extrabold text-emerald-600 uppercase">Available</div>
            <div className="text-xl font-black font-mono text-emerald-700 mt-1">{freeCount}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
            <div className="text-[10px] font-extrabold text-rose-600 uppercase">Occupied</div>
            <div className="text-xl font-black font-mono text-rose-700 mt-1">{occupiedCount}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
            <div className="text-[10px] font-extrabold text-amber-600 uppercase">Reserved</div>
            <div className="text-xl font-black font-mono text-amber-700 mt-1">{reservedCount}</div>
          </div>
        </div>

        {/* ACTIVE RESERVATIONS PANEL */}
        {activeReservations.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h2 className="text-xs font-black uppercase text-amber-900 tracking-wide">📅 Upcoming & Active Table Reservations</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {activeReservations.map(res => {
                const assignedTable = tables.find(t => t.id === res.table_id)
                const startTimeStr = new Date(res.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                const endTimeStr = new Date(res.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                return (
                  <div key={res.id} className="bg-white border border-amber-300 rounded-xl p-4 flex flex-col justify-between space-y-2 shadow-2xs">
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="font-black text-gray-900 text-sm">{res.customer_name}</span>
                        <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                          {assignedTable?.table_number || assignedTable?.name || 'Table'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">📞 {res.customer_phone} | 👥 {res.party_size} Guests</div>
                      <div className="text-[11px] font-mono text-amber-800 mt-1 font-semibold">⏰ {startTimeStr} — {endTimeStr}</div>
                    </div>

                    <div className="flex space-x-2 pt-2 border-t border-gray-100">
                      <button 
                        onClick={() => handleMarkAttended(res)}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition shadow-2xs"
                      >
                        ✓ Customer Attended
                      </button>
                      <button 
                        onClick={() => handleCancelReservation(res)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[11px] font-bold transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* RESERVATION HISTORY & AUDIT REPORT SECTION */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-3">
            <div>
              <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider">📊 Reservation History & Audit Report</h2>
              <p className="text-[11px] text-gray-500">Track past and active guest bookings, priority customers, and staff audit logs.</p>
            </div>

            {/* FILTERS BAR */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <input 
                type="text" 
                placeholder="🔍 Search name / phone..." 
                value={filterSearch}
                onChange={e => setFilterSearch(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-slate-900"
              />

              <input 
                type="date" 
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-mono font-medium focus:outline-none focus:border-slate-900"
              />

              <select 
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold uppercase focus:outline-none focus:border-slate-900"
              >
                <option value="ALL">All Statuses</option>
                <option value="RESERVED">Reserved</option>
                <option value="ATTENDED">Attended</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="EXPIRED">Expired</option>
              </select>

              {(filterSearch || filterStatus !== 'ALL' || filterDate) && (
                <button 
                  onClick={() => { setFilterSearch(''); setFilterStatus('ALL'); setFilterDate(''); }}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-xl text-xs font-bold text-gray-700"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b text-[10px] font-extrabold text-gray-400 uppercase">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Contact Number</th>
                  <th className="py-3 px-4">Reservation Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reserved By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredReservations.length > 0 ? (
                  filteredReservations.map(res => {
                    const dateStr = new Date(res.start_time).toLocaleDateString()
                    const startTimeStr = new Date(res.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    const endTimeStr = new Date(res.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                    const isAttended = res.status === 'ATTENDED'
                    const isCancelled = res.status === 'CANCELLED'
                    const isExpired = res.status === 'EXPIRED'

                    const statusBadge = isAttended ? 'bg-emerald-100 text-emerald-800' :
                                        isCancelled ? 'bg-rose-100 text-rose-800' :
                                        isExpired ? 'bg-gray-200 text-gray-700' :
                                        'bg-amber-100 text-amber-800'

                    return (
                      <tr key={res.id} className="hover:bg-gray-50/60 transition">
                        <td className="py-3 px-4 font-mono text-gray-600">{dateStr}</td>
                        <td className="py-3 px-4 font-black text-gray-900">{res.customer_name}</td>
                        <td className="py-3 px-4 font-mono text-gray-600">{res.customer_phone}</td>
                        <td className="py-3 px-4 font-mono text-gray-700">{startTimeStr} — {endTimeStr}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase ${statusBadge}`}>
                            {res.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-700">{res.reserved_by || 'Manager'}</td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400">
                      No reservation history records found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ZONE FILTER TABS WITH DRAG & DROP REORDERING */}
        <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-xs space-y-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-extrabold uppercase text-gray-400">Filter Zone (Arrangements are saved automatically):</span>
            <span className="text-[10px] font-bold text-indigo-600">💡 Drag and drop zone tabs or table tiles to reorder permanently</span>
          </div>
          <div className="flex items-center space-x-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveZone('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition uppercase whitespace-nowrap ${
                activeZone === 'ALL' ? 'bg-slate-900 text-white shadow-2xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Zones ({tables.length})
            </button>
            {zones.map(z => (
              <button
                key={z}
                draggable
                onDragStart={(e) => handleZoneDragStart(e, z)}
                onDragOver={handleZoneDragOver}
                onDrop={(e) => handleZoneDrop(e, z)}
                onClick={() => setActiveZone(z)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition uppercase whitespace-nowrap cursor-grab active:cursor-grabbing flex items-center space-x-1.5 ${
                  activeZone === z ? 'bg-slate-900 text-white shadow-2xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                }`}
              >
                <span>⠿</span>
                <span>📍 {z}</span>
              </button>
            ))}
          </div>
        </div>

        {/* TABLES DISPLAY AREA WITH TABLE TILE DRAG & DROP */}
        {activeZone === 'ALL' ? (
          <div className="space-y-6">
            {zones.map(zoneName => {
              const zoneTables = tables
                .filter(t => (t.zone_name || t.zone || 'MAIN HALL').toUpperCase() === zoneName)
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

              if (zoneTables.length === 0) return null

              return (
                <div key={zoneName} className="space-y-3 bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
                  <div className="flex justify-between items-center border-b pb-2.5">
                    <h3 className="font-black text-xs uppercase tracking-wider text-slate-900">📍 Zone: {zoneName}</h3>
                    <span className="text-[10px] font-mono font-bold text-gray-500">{zoneTables.length} Tables (Drag tiles to reorder)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {zoneTables.map(t => {
                      const isOccupied = t.status === 'occupied'
                      const isReserved = t.status === 'reserved'

                      const badgeStyle = isOccupied ? 'bg-rose-100 text-rose-800' :
                                         isReserved ? 'bg-amber-100 text-amber-800' :
                                         'bg-emerald-100 text-emerald-800'

                      const dotColor = isOccupied ? 'bg-rose-500' : isReserved ? 'bg-amber-500' : 'bg-emerald-500'

                      return (
                        <div 
                          key={t.id}
                          draggable
                          onDragStart={(e) => handleTableDragStart(e, t.id)}
                          onDragOver={handleZoneDragOver}
                          onDrop={(e) => handleTableDrop(e, t.id, zoneName)}
                          className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:shadow-sm transition cursor-grab active:cursor-grabbing relative"
                        >
                          <div className="absolute top-2 right-2 text-gray-300 text-[10px] font-mono">⠿</div>
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider block">
                                {t.zone_name || t.zone || 'MAIN HALL'}
                              </span>
                              <h4 className="font-black text-sm text-gray-900 mt-0.5">
                                {t.table_number || t.name}
                              </h4>
                            </div>
                            <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
                          </div>

                          <div className="bg-white border border-gray-100 rounded-xl p-2.5 flex items-center justify-between">
                            <span className="text-[11px] text-gray-500 font-medium">Capacity</span>
                            <span className="text-[11px] font-mono font-bold text-gray-900">🪑 {t.capacity || t.seats || 4} Guests</span>
                          </div>

                          <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${badgeStyle}`}>
                              {t.status || 'available'}
                            </span>
                            
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => openEditModal(t)}
                                className="px-2.5 py-1 bg-white border hover:bg-gray-100 text-gray-700 rounded-lg text-[11px] font-bold transition"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteTable(t.id)}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[11px] font-bold transition"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tables
              .filter(t => (t.zone_name || t.zone || 'MAIN HALL').toUpperCase() === activeZone)
              .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              .map(t => {
                const isOccupied = t.status === 'occupied'
                const isReserved = t.status === 'reserved'

                const badgeStyle = isOccupied ? 'bg-rose-100 text-rose-800' :
                                   isReserved ? 'bg-amber-100 text-amber-800' :
                                   'bg-emerald-100 text-emerald-800'

                const dotColor = isOccupied ? 'bg-rose-500' : isReserved ? 'bg-amber-500' : 'bg-emerald-500'

                return (
                  <div 
                    key={t.id}
                    draggable
                    onDragStart={(e) => handleTableDragStart(e, t.id)}
                    onDragOver={handleZoneDragOver}
                    onDrop={(e) => handleTableDrop(e, t.id, activeZone)}
                    className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition cursor-grab active:cursor-grabbing relative"
                  >
                    <div className="absolute top-3 right-3 text-gray-300 text-xs font-mono">⠿</div>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                          {t.zone_name || t.zone || 'MAIN HALL'}
                        </span>
                        <h3 className="font-black text-base text-gray-900 mt-0.5">
                          {t.table_number || t.name}
                        </h3>
                      </div>
                      <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`}></span>
                    </div>

                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-medium">Seating Capacity</span>
                      <span className="text-xs font-mono font-bold text-gray-900">🪑 {t.capacity || t.seats || 4} Guests</span>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase ${badgeStyle}`}>
                        {t.status || 'available'}
                      </span>
                      
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => openEditModal(t)}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteTable(t.id)}
                          className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        )}

      </main>

      {/* RESERVATION MODAL */}
      {showResModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveReservation} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-sm font-black uppercase text-gray-900">Reserve Table for Customer</h2>
              <button type="button" onClick={() => setShowResModal(false)} className="text-gray-400 hover:text-black font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Customer Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. John Doe" 
                  value={resCustomerName}
                  onChange={e => setResCustomerName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 font-bold focus:outline-none focus:border-slate-900"
                  required 
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Customer Mobile Number</label>
                <input 
                  type="text" 
                  placeholder="e.g. 03001234567" 
                  value={resCustomerPhone}
                  onChange={e => setResCustomerPhone(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 font-bold focus:outline-none focus:border-slate-900"
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Party Size (Guests)</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={resPartySize}
                    onChange={e => setResPartySize(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 font-mono font-bold"
                    required 
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Select Zone (Category)</label>
                  <select 
                    value={resSelectedZone}
                    onChange={e => {
                      setResSelectedZone(e.target.value)
                      setResTableId('')
                    }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 font-bold uppercase"
                    required
                  >
                    {zones.map(z => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Select Available Table in {resSelectedZone}</label>
                <select 
                  value={resTableId}
                  onChange={e => setResTableId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-bold uppercase"
                  required
                >
                  <option value="">Choose Available Table</option>
                  {resAvailableTables.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.table_number || t.name} ({t.capacity || t.seats || 4} Seats)
                    </option>
                  ))}
                </select>
                {resAvailableTables.length === 0 && (
                  <p className="text-[10px] text-rose-600 font-bold mt-1">No available tables in this zone.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Reservation Start Time</label>
                  <input 
                    type="datetime-local" 
                    value={resStartTime}
                    onChange={e => setResStartTime(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-mono text-[11px]"
                    required 
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Reservation End Time</label>
                  <input 
                    type="datetime-local" 
                    value={resEndTime}
                    onChange={e => setResEndTime(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-mono text-[11px]"
                    required 
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t">
              <button type="button" onClick={() => setShowResModal(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-sm">
                Confirm Reservation
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ZONE MANAGEMENT MODAL */}
      {showZoneModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-5 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-sm font-black uppercase text-gray-900">Manage Restaurant Zones</h2>
              <button onClick={() => setShowZoneModal(false)} className="text-gray-400 hover:text-black font-bold">✕</button>
            </div>

            <form onSubmit={handleAddZone} className="space-y-3">
              <label className="text-xs font-bold text-gray-700 block">Add New Zone</label>
              <div className="flex space-x-2">
                <input 
                  type="text" 
                  placeholder="e.g. Rooftop, Garden" 
                  value={newZoneName}
                  onChange={e => setNewZoneName(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none focus:border-slate-900"
                />
                <button type="submit" className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-sm">
                  Add
                </button>
              </div>
            </form>

            <div className="space-y-2 pt-2 border-t">
              <label className="text-xs font-bold text-gray-500 block uppercase">Existing Zones (Drag to Arrange)</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {zones.map(z => (
                  <div 
                    key={z} 
                    draggable
                    onDragStart={(e) => handleZoneDragStart(e, z)}
                    onDragOver={handleZoneDragOver}
                    onDrop={(e) => handleZoneDrop(e, z)}
                    className="flex justify-between items-center p-2.5 bg-gray-50 border rounded-xl text-xs cursor-grab active:cursor-grabbing hover:bg-gray-100 transition"
                  >
                    {editingZoneOldName === z ? (
                      <div className="flex items-center space-x-1.5 flex-1 mr-2">
                        <input 
                          type="text" 
                          value={editingZoneNewName} 
                          onChange={e => setEditingZoneNewName(e.target.value)} 
                          className="flex-1 px-2 py-1 border rounded-lg text-xs font-bold bg-white"
                        />
                        <button type="button" onClick={() => handleUpdateZone(z)} className="px-2 py-1 bg-slate-900 text-white rounded-lg font-bold">Save</button>
                        <button type="button" onClick={() => setEditingZoneOldName(null)} className="px-2 py-1 border rounded-lg">✕</button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400 font-mono">⠿</span>
                        <span className="font-extrabold text-gray-900 uppercase">📍 {z}</span>
                      </div>
                    )}

                    {editingZoneOldName !== z && (
                      <div className="flex space-x-2 font-bold text-[11px]">
                        <button type="button" onClick={() => { setEditingZoneOldName(z); setEditingZoneNewName(z); }} className="text-blue-600 hover:underline">Edit</button>
                        <button type="button" onClick={() => handleDeleteZone(z)} className="text-rose-600 hover:underline">Delete</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t">
              <button type="button" onClick={() => setShowZoneModal(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold">
                Close & Save Arrangements
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TABLE ADD / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveTable} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-sm font-black uppercase text-gray-900">
                {editingTable ? 'Edit Table' : 'Add New Table'}
              </h2>
              <button type="button" onClick={closeModal} className="text-gray-400 hover:text-black font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Table Name / Number</label>
                <input 
                  type="text" 
                  placeholder="e.g. T-01 or Booth 4" 
                  value={tableName}
                  onChange={e => setTableName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 font-bold focus:outline-none focus:border-slate-900"
                  required 
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Select Zone</label>
                <select 
                  value={tableZone}
                  onChange={e => setTableZone(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-bold uppercase focus:outline-none focus:border-slate-900"
                  required
                >
                  {zones.map(z => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Seating Capacity</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={tableSeats}
                    onChange={e => setTableSeats(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 font-mono font-bold focus:outline-none focus:border-slate-900"
                    required 
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Initial Status</label>
                  <select 
                    value={tableStatus}
                    onChange={e => setTableStatus(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-bold uppercase focus:outline-none focus:border-slate-900"
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="reserved">Reserved</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t">
              <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-sm">
                {editingTable ? 'Update Table' : 'Save Table'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  )
}