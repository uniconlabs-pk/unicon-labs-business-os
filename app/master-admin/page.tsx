'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface BusinessTenant {
  id: string
  name: string
  slug: string
  business_type: string
  currency_symbol: string
  subscription_status: string
  has_pos: boolean
  has_kds: boolean
  has_storefront: boolean
  has_erp: boolean
  has_dispatch_queue?: boolean
  has_tables?: boolean
  address: string
  phone: string
  email: string
  web_url: string
  working_hours: string
  logo_url: string
  contact_person_name: string
  contact_person_phone: string
  contact_person_email: string
  enable_fbr_integration?: boolean
  fbr_pos_id?: string
  tax_enabled?: boolean
  tax_rate?: number
  tax_label?: string
  enable_manual_tax?: boolean
  manual_strn?: string
  manual_tax_type?: string
  manual_tax_term?: string
  enable_dual_tax_tier?: boolean
  cash_tax_rate?: number
  digital_tax_rate?: number
  created_at: string
}

interface WorkingHourDay {
  day: string
  from: string
  to: string
  from2: string
  to2: string
  split: boolean
  closed: boolean
}

const DEFAULT_SCHEDULE: WorkingHourDay[] = [
  { day: 'Monday', from: '09:00 AM', to: '11:00 PM', from2: '', to2: '', split: false, closed: false },
  { day: 'Tuesday', from: '09:00 AM', to: '11:00 PM', from2: '', to2: '', split: false, closed: false },
  { day: 'Wednesday', from: '09:00 AM', to: '11:00 PM', from2: '', to2: '', split: false, closed: false },
  { day: 'Thursday', from: '09:00 AM', to: '11:00 PM', from2: '', to2: '', split: false, closed: false },
  { day: 'Friday', from: '03:00 PM', to: '12:00 AM', from2: '', to2: '', split: false, closed: false },
  { day: 'Saturday', from: '09:00 AM', to: '11:00 PM', from2: '', to2: '', split: false, closed: false },
  { day: 'Sunday', from: '09:00 AM', to: '11:00 PM', from2: '', to2: '', split: false, closed: false },
]

export default function MasterAdminPanel() {
  const router = useRouter()

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginUser, setLoginUser] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // Dashboard Tab State ('tenants' | 'settings')
  const [activeTab, setActiveTab] = useState<'tenants' | 'settings'>('tenants')

  // Tenants State
  const [tenants, setTenants] = useState<BusinessTenant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Reset Modal State
  const [showResetModal, setShowResetModal] = useState(false)
  const [resettingTenant, setResettingTenant] = useState<BusinessTenant | null>(null)
  const [resetOrders, setResetOrders] = useState(true)
  const [resetKots, setResetKots] = useState(true)
  const [resetTables, setResetTables] = useState(true)
  const [resetSequences, setResetSequences] = useState(true)
  const [resetReturns, setResetReturns] = useState(true)
  const [isResetting, setIsResetting] = useState(false)

  // New Tenant Modal State
  const [showNewModal, setShowNewModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newType, setNewType] = useState('restaurant')
  const [newCurrency, setNewCurrency] = useState('Rs.')
  const [newColor, setNewColor] = useState('#000000')
  const [newAddress, setNewAddress] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newWebUrl, setNewWebUrl] = useState('')
  const [newSchedule, setNewSchedule] = useState<WorkingHourDay[]>(DEFAULT_SCHEDULE)
  const [newLogoUrl, setNewLogoUrl] = useState('')
  const [newCpName, setNewCpName] = useState('')
  const [newCpPhone, setNewCpPhone] = useState('')
  const [newCpEmail, setNewCpEmail] = useState('')

  // FBR Provisioning State
  const [enableFbr, setEnableFbr] = useState(false)
  const [fbrPosId, setFbrPosId] = useState('')

  // Manual Tax Provisioning State
  const [enableManualTax, setEnableManualTax] = useState(false)
  const [manualStrn, setManualStrn] = useState('')
  const [manualTaxRate, setManualTaxRate] = useState('15')
  const [manualTaxType, setManualTaxType] = useState('GST')
  const [manualTaxTerm, setManualTaxTerm] = useState('EXCLUSIVE')

  // Dual-Tier Tax Provisioning State
  const [newEnableDualTax, setNewEnableDualTax] = useState(false)
  const [newCashTaxRate, setNewCashTaxRate] = useState('15.00')
  const [newDigitalTaxRate, setNewDigitalTaxRate] = useState('8.00')

  // Settings Credential State
  const [newAdminUser, setNewAdminUser] = useState('')
  const [newAdminPass, setNewAdminPass] = useState('')
  const [savingCreds, setSavingCreds] = useState(false)

  useEffect(() => {
    async function ensureDefaultAuth() {
      await supabase
        .from('master_admin_auth')
        .upsert([{ username: 'uniconlabs', password_hash: 'unicon1233' }], { onConflict: 'username' })
    }
    ensureDefaultAuth()

    const sessionAuth = sessionStorage.getItem('unicon_master_auth')
    if (sessionAuth === 'true') {
      setIsAuthenticated(true)
      loadAllTenants()
    } else {
      setLoading(false)
    }
  }, [])

  // REAL-TIME WEBSOCKET SUBSCRIPTION FOR TENANTS DIRECTORY
  useEffect(() => {
    if (!isAuthenticated) return

    const channel = supabase
      .channel('master-admin-businesses-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'businesses' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newBiz = payload.new as BusinessTenant
          setTenants(prev => {
            if (prev.some(t => t.id === newBiz.id)) return prev
            return [newBiz, ...prev]
          })
        } else if (payload.eventType === 'UPDATE') {
          const updatedBiz = payload.new as BusinessTenant
          setTenants(prev => prev.map(t => t.id === updatedBiz.id ? { ...t, ...updatedBiz } : t))
        } else if (payload.eventType === 'DELETE') {
          const deletedId = payload.old.id
          setTenants(prev => prev.filter(t => t.id !== deletedId))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAuthenticated])

  async function loadAllTenants() {
    setLoading(true)
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setTenants(data)
    }
    setLoading(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)

    const { data, error } = await supabase
      .from('master_admin_auth')
      .select('*')
      .eq('username', loginUser.trim())
      .single()

    if (error || !data || data.password_hash !== loginPass) {
      alert('Invalid Master Admin username or password.')
      setAuthLoading(false)
      return
    }

    setIsAuthenticated(true)
    sessionStorage.setItem('unicon_master_auth', 'true')
    setAuthLoading(false)
    loadAllTenants()
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    sessionStorage.removeItem('unicon_master_auth')
  }

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAdminUser || !newAdminPass) return alert('Please enter both new username and password.')

    setSavingCreds(true)
    const { error } = await supabase
      .from('master_admin_auth')
      .update({ username: newAdminUser.trim(), password_hash: newAdminPass })
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (error) {
      alert(`Failed to update credentials: ${error.message}`)
    } else {
      alert('Master credentials updated successfully! Please log in again with your new details.')
      handleLogout()
    }
    setSavingCreds(false)
  }

  const handleToggleModule = async (id: string, moduleKey: 'has_pos' | 'has_kds' | 'has_storefront' | 'has_erp' | 'has_dispatch_queue', currentState: boolean) => {
    const newState = !currentState
    setTenants(tenants.map(t => t.id === id ? { ...t, [moduleKey]: newState } : t))

    const { error } = await supabase
      .from('businesses')
      .update({ [moduleKey]: newState })
      .eq('id', id)

    if (error) {
      alert(`Failed to update module permission: ${error.message}`)
      loadAllTenants()
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = (currentStatus === 'suspended') ? 'active' : 'suspended'
    
    setTenants(tenants.map(t => t.id === id ? { ...t, subscription_status: newStatus } : t))

    const { error } = await supabase
      .from('businesses')
      .update({ subscription_status: newStatus })
      .eq('id', id)

    if (error) {
      alert(`Failed to update tenant status: ${error.message}`)
      loadAllTenants()
    }
  }

  const handleExecuteTenantReset = async () => {
    if (!resettingTenant) return
    setIsResetting(true)

    try {
      if (resetOrders) {
        await supabase.from('orders').delete().eq('business_id', resettingTenant.id)
      }
      if (resetKots) {
        await supabase.from('kds_tickets').delete().eq('business_id', resettingTenant.id)
      }
      if (resetReturns) {
        await supabase.from('order_refunds').delete().eq('business_id', resettingTenant.id)
      }
      if (resetTables) {
        await supabase.from('tables').update({ status: 'available' }).eq('business_id', resettingTenant.id)
      }
      if (resetSequences) {
        await supabase.from('businesses').update({
          next_order_seq: 100011,
          next_serial_seq: 100011,
          next_kot_seq: 100011,
          next_srr_seq: 100011
        }).eq('id', resettingTenant.id)
      }

      alert(`Successfully reset records for tenant: ${resettingTenant.name}`)
      setShowResetModal(false)
      setResettingTenant(null)
    } catch (err: any) {
      alert(`Error during reset operation: ${err.message || err}`)
    } finally {
      setIsResetting(false)
    }
  }

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName || !newSlug) return alert('Name and Slug are required.')
    if (enableFbr && !fbrPosId.trim()) return alert('FBR POS Registration ID is required when FBR compliance is enabled.')
    if (enableManualTax && !manualStrn.trim()) return alert('STRN / VAT Number is required when Manual Tax Integration is enabled.')

    const scheduleString = JSON.stringify(newSchedule)

    const { error } = await supabase.from('businesses').insert([{
      name: newName,
      slug: newSlug.toLowerCase().trim().replace(/\s+/g, '-'),
      business_type: newType,
      currency_symbol: newCurrency,
      primary_color: newColor,
      subscription_status: 'active',
      has_pos: true,
      has_kds: true,
      has_storefront: true,
      has_erp: true,
      has_dispatch_queue: true,
      address: newAddress,
      phone: newPhone,
      email: newEmail,
      web_url: newWebUrl,
      working_hours: scheduleString,
      logo_url: newLogoUrl,
      contact_person_name: newCpName,
      contact_person_phone: newCpPhone,
      contact_person_email: newCpEmail,
      enable_fbr_integration: enableFbr,
      fbr_pos_id: enableFbr ? fbrPosId.trim() : null,
      tax_enabled: enableFbr || enableManualTax,
      tax_rate: enableFbr ? 16.00 : (enableManualTax ? parseFloat(manualTaxRate) || 0 : 0.00),
      tax_label: enableFbr ? 'GST' : (enableManualTax ? manualTaxType : 'NONE'),
      enable_manual_tax: enableManualTax,
      manual_strn: enableManualTax ? manualStrn.trim() : null,
      manual_tax_type: enableManualTax ? manualTaxType : null,
      manual_tax_term: enableManualTax ? manualTaxTerm : null,
      enable_dual_tax_tier: newEnableDualTax,
      cash_tax_rate: newEnableDualTax ? parseFloat(newCashTaxRate) || 15.00 : 15.00,
      digital_tax_rate: newEnableDualTax ? parseFloat(newDigitalTaxRate) || 8.00 : 8.00
    }])

    if (error) {
      alert(`Failed to provision tenant: ${error.message}`)
    } else {
      alert('Tenant successfully provisioned!')
      setShowNewModal(false)
      setNewName('')
      setNewSlug('')
      setNewType('restaurant')
      setNewAddress('')
      setNewPhone('')
      setNewEmail('')
      setNewWebUrl('')
      setNewLogoUrl('')
      setNewCpName('')
      setNewCpPhone('')
      setNewCpEmail('')
      setEnableFbr(false)
      setFbrPosId('')
      setEnableManualTax(false)
      setManualStrn('')
      setManualTaxRate('15')
      setManualTaxType('GST')
      setManualTaxTerm('EXCLUSIVE')
      setNewEnableDualTax(false)
      setNewCashTaxRate('15.00')
      setNewDigitalTaxRate('8.00')
      setNewSchedule(DEFAULT_SCHEDULE)
      loadAllTenants()
    }
  }

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.slug.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4 font-sans">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-emerald-600 rounded-2xl mx-auto flex items-center justify-center text-2xl font-bold shadow-lg">
              🔐
            </div>
            <h1 className="text-xl font-extrabold tracking-wide text-white">UNICON LABS</h1>
            <p className="text-xs text-gray-400 uppercase tracking-widest">Master Admin Authentication Gate</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-400 font-medium mb-1">Master Admin Username</label>
              <input 
                type="text" 
                placeholder="e.g. uniconlabs" 
                value={loginUser} 
                onChange={e => setLoginUser(e.target.value)} 
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                required 
              />
            </div>
            <div>
              <label className="block text-gray-400 font-medium mb-1">Master Password</label>
              <input 
                type="password" 
                placeholder="••••••••••••" 
                value={loginPass} 
                onChange={e => setLoginPass(e.target.value)} 
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                required 
              />
            </div>
            <button 
              type="submit" 
              disabled={authLoading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow-lg text-sm"
            >
              {authLoading ? 'Authenticating...' : 'Access Master Console'}
            </button>
          </form>

          <div className="text-center pt-2">
            <a href="/" className="text-xs text-gray-500 hover:text-gray-300 transition">← Back to Home Portal</a>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white text-lg">Loading Master Console...</div>
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col font-sans">
      
      {/* Header */}
      <header className="px-8 py-5 border-b border-gray-800 flex justify-between items-center bg-black/40 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-xl font-bold shadow">
            🌐
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-wide">UNICON LABS — Master Admin Command</h1>
            <p className="text-xs text-gray-400 uppercase tracking-widest">Global Multi-Tenant Ecosystem & Directory (Live Sync Active ⚡)</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow"
          >
            + Provision New Tenant
          </button>
          <button 
            onClick={handleLogout}
            className="bg-red-900/40 hover:bg-red-900/60 text-red-300 px-4 py-2 rounded-xl text-xs font-semibold transition border border-red-800"
          >
            Lock Session
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-gray-800 border-b border-gray-700 px-8 py-3 flex space-x-4">
        <button 
          onClick={() => setActiveTab('tenants')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'tenants' ? 'bg-emerald-600 text-white shadow' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
        >
          🏢 Tenant Ecosystem Directory ({tenants.length})
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'settings' ? 'bg-emerald-600 text-white shadow' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
        >
          ⚙️ Admin Panel Security Settings
        </button>
      </div>

      {/* Main Content */}
      <main className="p-8 max-w-7xl mx-auto flex-1 w-full space-y-6">
        
        {activeTab === 'tenants' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-md space-y-1">
                <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Total Active Tenants</span>
                <p className="text-3xl font-mono font-extrabold text-emerald-400">{tenants.length}</p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-md space-y-1">
                <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Active Subscriptions</span>
                <p className="text-3xl font-mono font-extrabold text-green-400">
                  {tenants.filter(t => t.subscription_status === 'active' || !t.subscription_status).length}
                </p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-md space-y-1">
                <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">System Tenants</span>
                <p className="text-3xl font-mono font-extrabold text-blue-400">{tenants.length}</p>
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-md space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="font-bold text-sm uppercase tracking-wider text-emerald-400">Ecosystem Tenants & Modular Access</h2>
                <input 
                  type="text" 
                  placeholder="Search by tenant name or slug..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-xs text-white w-full md:w-72" 
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-900 text-gray-400 uppercase">
                    <tr>
                      <th className="p-3.5">Tenant Name / Profile</th>
                      <th className="p-3.5">Slug Route</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Granular Modules</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredTenants.length > 0 ? filteredTenants.map(tenant => (
                      <tr key={tenant.id} className="hover:bg-gray-700/50 transition">
                        <td className="p-3.5">
                          <button 
                            onClick={() => router.push(`/master-admin/tenants/${tenant.slug}`)}
                            className="font-bold text-white flex items-center space-x-3 text-left hover:text-emerald-400 transition group"
                          >
                            {tenant.logo_url && tenant.logo_url.trim() !== '' ? (
                              <div className="w-9 h-9 bg-gray-800 rounded-xl overflow-hidden border border-gray-700 flex items-center justify-center p-1 shrink-0">
                                <img 
                                  src={tenant.logo_url} 
                                  alt="" 
                                  className="w-full h-full object-contain" 
                                  onError={(e)=>{
                                    const parent = (e.target as HTMLElement).parentElement;
                                    if (parent) {
                                      parent.innerHTML = '<span class="text-sm">🏢</span>';
                                    }
                                  }} 
                                />
                              </div>
                            ) : (
                              <div className="w-9 h-9 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center text-sm shrink-0">
                                🏢
                              </div>
                            )}
                            <span className="group-hover:underline">{tenant.name}</span>
                          </button>
                        </td>
                        <td className="p-3.5 font-mono text-emerald-300">
                          <a href={`/${tenant.slug}`} target="_blank" rel="noreferrer" className="hover:underline">
                            /{tenant.slug} ↗
                          </a>
                        </td>
                        <td className="p-3.5 text-gray-300 uppercase font-semibold">
                          {tenant.business_type || 'restaurant'}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            tenant.subscription_status === 'suspended' ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'
                          }`}>
                            {tenant.subscription_status || 'active'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1">
                            <button onClick={() => handleToggleModule(tenant.id, 'has_pos', tenant.has_pos ?? true)} className={`px-2 py-0.5 rounded text-[9px] font-bold ${tenant.has_pos !== false ? 'bg-emerald-900/50 text-emerald-300' : 'bg-gray-800 text-gray-500'}`}>POS</button>
                            <button onClick={() => handleToggleModule(tenant.id, 'has_kds', tenant.has_kds ?? true)} className={`px-2 py-0.5 rounded text-[9px] font-bold ${tenant.has_kds !== false ? 'bg-emerald-900/50 text-emerald-300' : 'bg-gray-800 text-gray-500'}`}>KDS</button>
                            <button onClick={() => handleToggleModule(tenant.id, 'has_dispatch_queue', tenant.has_dispatch_queue ?? true)} className={`px-2 py-0.5 rounded text-[9px] font-bold ${tenant.has_dispatch_queue !== false ? 'bg-emerald-900/50 text-emerald-300' : 'bg-gray-800 text-gray-500'}`}>Dispatch</button>
                            <button onClick={() => handleToggleModule(tenant.id, 'has_storefront', tenant.has_storefront ?? true)} className={`px-2 py-0.5 rounded text-[9px] font-bold ${tenant.has_storefront !== false ? 'bg-emerald-900/50 text-emerald-300' : 'bg-gray-800 text-gray-500'}`}>Store</button>
                            <button onClick={() => handleToggleModule(tenant.id, 'has_erp', tenant.has_erp ?? true)} className={`px-2 py-0.5 rounded text-[9px] font-bold ${tenant.has_erp !== false ? 'bg-emerald-900/50 text-emerald-300' : 'bg-gray-800 text-gray-500'}`}>ERP</button>
                          </div>
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          <button 
                            onClick={() => { setResettingTenant(tenant); setShowResetModal(true); }}
                            className="px-2.5 py-1 bg-amber-900/40 text-amber-300 border border-amber-700 hover:bg-amber-900/70 rounded-lg font-bold text-[10px] transition"
                            title="Reset records for this tenant"
                          >
                            🔄 Reset Data
                          </button>
                          <button 
                            onClick={() => handleToggleStatus(tenant.id, tenant.subscription_status || 'active')}
                            className={`px-3 py-1 rounded-lg font-semibold text-[10px] transition ${
                              tenant.subscription_status === 'suspended' ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'
                            }`}
                          >
                            {tenant.subscription_status === 'suspended' ? 'Activate' : 'Suspend'}
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-gray-500">No tenants found matching your search.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-xl mx-auto bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-md space-y-5">
            <div>
              <h2 className="font-bold text-sm uppercase tracking-wider text-emerald-400">Change Master Admin Credentials</h2>
              <p className="text-xs text-gray-400 mt-1">Update your login username and master password for the UNICON Labs console.</p>
            </div>

            <form onSubmit={handleUpdateCredentials} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-400 font-medium mb-1">New Username</label>
                <input 
                  type="text" 
                  placeholder="e.g. uniconlabs" 
                  value={newAdminUser} 
                  onChange={e => setNewAdminUser(e.target.value)} 
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white"
                  required 
                />
              </div>
              <div>
                <label className="block text-gray-400 font-medium mb-1">New Master Password</label>
                <input 
                  type="password" 
                  placeholder="Enter secure new password" 
                  value={newAdminPass} 
                  onChange={e => setNewAdminPass(e.target.value)} 
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white"
                  required 
                />
              </div>
              <button 
                type="submit" 
                disabled={savingCreds}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow"
              >
                {savingCreds ? 'Updating Credentials...' : 'Save & Re-Authenticate'}
              </button>
            </form>
          </div>
        )}

      </main>

      {/* RESET RECORDS SELECTION MODAL */}
      {showResetModal && resettingTenant && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-gray-700 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-amber-400">Reset Tenant Records</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Tenant: <span className="text-white font-bold">{resettingTenant.name}</span></p>
              </div>
              <button onClick={() => setShowResetModal(false)} className="text-gray-400 hover:text-white font-bold text-sm">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-gray-300">Select which operational records you want to wipe clean for this tenant:</p>
              
              <div className="space-y-2 bg-gray-900 p-4 rounded-xl border border-gray-700">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" checked={resetOrders} onChange={e => setResetOrders(e.target.checked)} className="rounded bg-gray-800 border-gray-700 text-amber-500 focus:ring-0 w-4 h-4" />
                  <span className="text-white font-semibold">Delete all Orders & Invoices (`orders`)</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" checked={resetKots} onChange={e => setResetKots(e.target.checked)} className="rounded bg-gray-800 border-gray-700 text-amber-500 focus:ring-0 w-4 h-4" />
                  <span className="text-white font-semibold">Delete all Kitchen Tickets (`kds_tickets`)</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" checked={resetReturns} onChange={e => setResetReturns(e.target.checked)} className="rounded bg-gray-800 border-gray-700 text-amber-500 focus:ring-0 w-4 h-4" />
                  <span className="text-white font-semibold">Delete all Sales Return Receipts / Refunds (`order_refunds`)</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" checked={resetTables} onChange={e => setResetTables(e.target.checked)} className="rounded bg-gray-800 border-gray-700 text-amber-500 focus:ring-0 w-4 h-4" />
                  <span className="text-white font-semibold">Reset all dine-in tables back to 'available'</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" checked={resetSequences} onChange={e => setResetSequences(e.target.checked)} className="rounded bg-gray-800 border-gray-700 text-amber-500 focus:ring-0 w-4 h-4" />
                  <span className="text-white font-semibold">Reset sequence numbers back to 100011</span>
                </label>
              </div>

              <div className="bg-amber-950/30 border border-amber-900/50 p-3 rounded-xl text-amber-300 text-[11px]">
                ⚠️ Warning: This action is permanent and cannot be undone for this tenant.
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button 
                type="button" 
                onClick={() => setShowResetModal(false)}
                className="w-1/2 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button 
                type="button" 
                disabled={isResetting}
                onClick={handleExecuteTenantReset}
                className="w-1/2 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow"
              >
                {isResetting ? 'Resetting...' : 'Confirm Reset ⚡'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provision New Tenant Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-gray-700 px-6 py-4 bg-gray-900/50 rounded-t-2xl shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400">Provision New Tenant Store</h3>
              <button 
                onClick={() => setShowNewModal(false)} 
                className="text-gray-400 hover:text-white font-bold text-lg bg-gray-800 border border-gray-700 px-3 py-1 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              <form onSubmit={handleCreateTenant} className="space-y-5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 font-medium mb-1">Business Name</label>
                    <input type="text" placeholder="e.g. Krunchy Bite" value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white" required />
                  </div>
                  <div>
                    <label className="block text-gray-400 font-medium mb-1">Business Type / Category</label>
                    <select value={newType} onChange={e => setNewType(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white uppercase">
                      <option value="restaurant">Restaurant</option>
                      <option value="retail">Retail Store</option>
                      <option value="perfumery">Perfumery</option>
                      <option value="Building Materials">Building Materials</option>
                      <option value="Pharmacy">Pharmacy</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-400 font-medium mb-1">URL Slug (no spaces)</label>
                    <input type="text" placeholder="e.g. krunchy-bite" value={newSlug} onChange={e => setNewSlug(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white font-mono" required />
                  </div>
                  <div>
                    <label className="block text-gray-400 font-medium mb-1">Currency Symbol</label>
                    <input type="text" value={newCurrency} onChange={e => setNewCurrency(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white font-mono" required />
                  </div>
                  <div>
                    <label className="block text-gray-400 font-medium mb-1">Phone / WhatsApp</label>
                    <input type="text" placeholder="+92 ..." value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="block text-gray-400 font-medium mb-1">Business Email</label>
                    <input type="email" placeholder="store@domain.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-gray-400 font-medium mb-1">Business Address</label>
                    <input type="text" placeholder="Street, Area, Karachi" value={newAddress} onChange={e => setNewAddress(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="block text-gray-400 font-medium mb-1">Logo URL / Path</label>
                    <input type="text" placeholder="/tenants/slug/logo.png" value={newLogoUrl} onChange={e => setNewLogoUrl(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white font-mono" />
                  </div>
                </div>

                <div className="space-y-3 border border-gray-700 p-4 rounded-xl bg-gray-900/60">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableFbr}
                      onChange={(e) => setEnableFbr(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded bg-gray-800 border-gray-700 focus:ring-0"
                    />
                    <div>
                      <span className="font-bold text-xs uppercase text-emerald-400 block">Enable FBR Fiscal Compliance</span>
                      <span className="text-[10px] text-gray-400">Enforces GST calculations, FBR POS telemetry sync, and receipt fiscal tagging.</span>
                    </div>
                  </label>

                  {enableFbr && (
                    <div className="pt-2">
                      <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">
                        FBR POS Registration ID *
                      </label>
                      <input
                        type="text"
                        required={enableFbr}
                        value={fbrPosId}
                        onChange={(e) => setFbrPosId(e.target.value)}
                        placeholder="e.g., POS-KRUNCHY-001"
                        className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3 border border-gray-700 p-4 rounded-xl bg-gray-900/60 mt-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableManualTax}
                      onChange={(e) => setEnableManualTax(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded bg-gray-800 border-gray-700 focus:ring-0"
                    />
                    <div>
                      <span className="font-bold text-xs uppercase text-emerald-400 block">Enable Manual Tax Integration (Self-Managed)</span>
                      <span className="text-[10px] text-gray-400">Allows tenant to calculate and manage local tax/VAT using their own STRN without live FBR sync.</span>
                    </div>
                  </label>

                  {enableManualTax && (
                    <div className="space-y-3 pt-2 border-t border-gray-800">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">
                          STRN / VAT Number *
                        </label>
                        <input
                          type="text"
                          required={enableManualTax}
                          value={manualStrn}
                          onChange={(e) => setManualStrn(e.target.value)}
                          placeholder="Enter 13 digits STRN/VAT Number."
                          className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">Tax Type</label>
                          <select
                            value={manualTaxType}
                            onChange={(e) => setManualTaxType(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white"
                          >
                            <option value="GST">GST - (General Sales Tax)</option>
                            <option value="VAT">VAT - (Value Added Tax)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">Tax Percentage (%)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={manualTaxRate}
                            onChange={(e) => setManualTaxRate(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono text-white"
                            required={enableManualTax}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">Tax Term / Basis</label>
                        <select
                          value={manualTaxTerm}
                          onChange={(e) => setManualTaxTerm(e.target.value)}
                          className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white font-bold"
                        >
                          <option value="EXCLUSIVE">EXCLUSIVE - (Tax %/Charges will be added on top of the item's price / subtotal)</option>
                          <option value="INCLUSIVE">INCLUSIVE - (Tax %/Charges is already included inside the item's price)</option>
                        </select>
                      </div>

                      {/* Dual-Tier Tax Sub-Option Model */}
                      <div className="pt-2 border-t border-gray-800 space-y-3">
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newEnableDualTax}
                            onChange={(e) => setNewEnableDualTax(e.target.checked)}
                            className="w-4 h-4 text-amber-500 rounded bg-gray-800 border-gray-700 focus:ring-0"
                          />
                          <div>
                            <span className="font-bold text-xs uppercase text-amber-400 block">Enable Dual Cash / Digital Tax Tiers</span>
                            <span className="text-[10px] text-gray-400">Applies lower tax for digital payments vs cash (e.g. 15% cash vs 8% digital).</span>
                          </div>
                        </label>

                        {newEnableDualTax && (
                          <div className="grid grid-cols-2 gap-2 bg-black/40 p-3 rounded-xl border border-gray-800">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Cash Payment Tax (%)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={newCashTaxRate}
                                onChange={(e) => setNewCashTaxRate(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-300 uppercase mb-1">Digital/Card Tax (%)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={newDigitalTaxRate}
                                onChange={(e) => setNewDigitalTaxRate(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3">
                  <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow">
                    Deploy Tenant Instance 🚀
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}