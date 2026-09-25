'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

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

export default function TenantDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()

  const [tenant, setTenant] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editSchedule, setEditSchedule] = useState<WorkingHourDay[]>(DEFAULT_SCHEDULE)
  const [tenantUsers, setTenantUsers] = useState<any[]>([])

  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [newTenantUser, setNewTenantUser] = useState('')
  const [newTenantPass, setNewTenantPass] = useState('')
  const [newTenantRole, setNewTenantRole] = useState('manager')

  useEffect(() => {
    async function loadTenantData() {
      setLoading(true)
      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .single()

      if (!biz) {
        router.push('/master-admin')
        return
      }
      setTenant(biz)

      try {
        const parsed = JSON.parse(biz.working_hours || '')
        if (Array.isArray(parsed)) {
          setEditSchedule(
            parsed.map((p: any) => ({
              ...p,
              from2: p.from2 || '',
              to2: p.to2 || '',
              split: p.split || false,
            }))
          )
        } else {
          setEditSchedule(DEFAULT_SCHEDULE)
        }
      } catch {
        setEditSchedule(DEFAULT_SCHEDULE)
      }

      const { data: users } = await supabase
        .from('tenant_users')
        .select('*')
        .eq('business_id', biz.id)

      setTenantUsers(users || [])
      setLoading(false)
    }

    loadTenantData()
  }, [slug, router])

  const handleUpdateTenantDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant) return

    const scheduleString = JSON.stringify(editSchedule)
    const { error } = await supabase
      .from('businesses')
      .update({
        name: tenant.name,
        business_type: tenant.business_type,
        address: tenant.address,
        phone: tenant.phone,
        email: tenant.email,
        web_url: tenant.web_url,
        working_hours: scheduleString,
        logo_url: tenant.logo_url,
        contact_person_name: tenant.contact_person_name,
        contact_person_phone: tenant.contact_person_phone,
        contact_person_email: tenant.contact_person_email,
        enable_fbr_integration: Boolean(tenant.enable_fbr_integration),
        fbr_pos_id: tenant.enable_fbr_integration ? tenant.fbr_pos_id || null : null,
        tax_enabled: Boolean(tenant.enable_fbr_integration),
        tax_rate: tenant.enable_fbr_integration ? 16.00 : 0.00,
        tax_label: tenant.enable_fbr_integration ? 'GST' : 'NONE',
      })
      .eq('id', tenant.id)

    if (error) {
      alert(`Failed to update tenant details: ${error.message}`)
    } else {
      alert('Tenant information updated successfully!')
    }
  }

  const handleDeleteTenant = async () => {
    if (!tenant) return
    const confirmation = prompt(`Type the tenant name "${tenant.name}" to confirm permanent deletion:`)
    if (confirmation !== tenant.name) {
      alert('Tenant name did not match. Deletion cancelled.')
      return
    }

    await supabase.from('tenant_users').delete().eq('business_id', tenant.id)
    const { error } = await supabase.from('businesses').delete().eq('id', tenant.id)

    if (error) {
      alert(`Failed to delete tenant: ${error.message}`)
    } else {
      alert('Tenant successfully deleted from ecosystem.')
      router.push('/master-admin')
    }
  }

  const handleSaveTenantUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant || !newTenantUser || !newTenantPass) return alert('Username and password required.')

    if (editingUserId) {
      const { error } = await supabase
        .from('tenant_users')
        .update({
          username: newTenantUser.trim(),
          password_hash: newTenantPass,
          role: newTenantRole,
        })
        .eq('id', editingUserId)

      if (error) {
        alert(`Failed to update store user: ${error.message}`)
      } else {
        alert('Store user updated successfully!')
        setEditingUserId(null)
        setNewTenantUser('')
        setNewTenantPass('')
        refreshUsers()
      }
    } else {
      const { error } = await supabase.from('tenant_users').insert([
        {
          business_id: tenant.id,
          username: newTenantUser.trim(),
          password_hash: newTenantPass,
          role: newTenantRole,
        },
      ])

      if (error) {
        alert(`Failed to create store user: ${error.message}`)
      } else {
        alert('Store user created successfully!')
        setNewTenantUser('')
        setNewTenantPass('')
        refreshUsers()
      }
    }
  }

  async function refreshUsers() {
    if (!tenant) return
    const { data: users } = await supabase
      .from('tenant_users')
      .select('*')
      .eq('business_id', tenant.id)
    setTenantUsers(users || [])
  }

  const handleDeleteTenantUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this login credential?')) return
    await supabase.from('tenant_users').delete().eq('id', userId)
    refreshUsers()
  }

  if (loading || !tenant) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center text-sm">Loading Tenant Configuration...</div>
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col font-sans">
      {/* Top Bar */}
      <header className="px-8 py-5 border-b border-gray-800 flex justify-between items-center bg-black/40 backdrop-blur-md">
        <div>
          <button onClick={() => router.push('/master-admin')} className="text-xs text-gray-400 hover:text-white mb-1 block">
            ← Back to Master Admin Command
          </button>
          <h1 className="text-xl font-extrabold tracking-wide">Tenant Store Details: {tenant.name}</h1>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Route Slug: /{tenant.slug}</p>
        </div>
        <a href={`/${tenant.slug}`} target="_blank" rel="noreferrer" className="px-4 py-2 bg-emerald-600/20 text-emerald-300 border border-emerald-700 rounded-xl text-xs font-bold">
          Open Live Store ↗
        </a>
      </header>

      {/* Main Content Layout */}
      <main className="p-8 max-w-5xl mx-auto flex-1 w-full space-y-6 text-xs">
        <form onSubmit={handleUpdateTenantDetails} className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-md space-y-6">
          <h2 className="font-bold text-sm uppercase tracking-wider text-emerald-400">Core Profile & Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 font-medium mb-1">Business Name</label>
              <input type="text" value={tenant.name} onChange={e => setTenant({ ...tenant, name: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white" required />
            </div>
            <div>
              <label className="block text-gray-400 font-medium mb-1">Business Type / Category</label>
              <select value={tenant.business_type || 'restaurant'} onChange={e => setTenant({ ...tenant, business_type: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white uppercase">
                <option value="restaurant">Restaurant</option>
                <option value="retail">Retail Store</option>
                <option value="perfumery">Perfumery</option>
                <option value="Building Materials">Building Materials</option>
                <option value="Pharmacy">Pharmacy</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 font-medium mb-1">Business Web URL</label>
              <input type="text" value={tenant.web_url || ''} onChange={e => setTenant({ ...tenant, web_url: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-gray-400 font-medium mb-1">Phone / WhatsApp Number</label>
              <input type="text" value={tenant.phone || ''} onChange={e => setTenant({ ...tenant, phone: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-gray-400 font-medium mb-1">Business Email</label>
              <input type="email" value={tenant.email || ''} onChange={e => setTenant({ ...tenant, email: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-gray-400 font-medium mb-1">Brand Logo Image URL / Path</label>
              <input type="text" value={tenant.logo_url || ''} onChange={e => setTenant({ ...tenant, logo_url: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white font-mono" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-400 font-medium mb-1">Physical Address</label>
              <input type="text" value={tenant.address || ''} onChange={e => setTenant({ ...tenant, address: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white" />
            </div>
          </div>

          {/* FBR Configuration */}
          <div className="pt-4 border-t border-gray-700 space-y-3">
            <span className="text-[11px] text-emerald-400 uppercase font-bold tracking-wider">FBR Fiscal Compliance Configuration</span>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-700 space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(tenant.enable_fbr_integration)}
                  onChange={e => setTenant({ 
                    ...tenant, 
                    enable_fbr_integration: e.target.checked,
                    tax_enabled: e.target.checked,
                    tax_rate: e.target.checked ? 16.00 : 0.00,
                    tax_label: e.target.checked ? 'GST' : 'NONE'
                  })}
                  className="rounded bg-gray-800 border-gray-700 text-emerald-600 focus:ring-0 w-4 h-4"
                />
                <div>
                  <span className="font-bold text-white text-xs block">Enable FBR Fiscal Integration</span>
                  <span className="text-[10px] text-gray-400">Syncs invoices to FBR API and enforces tax line items.</span>
                </div>
              </label>

              {tenant.enable_fbr_integration && (
                <div>
                  <label className="block text-gray-400 font-medium mb-1 text-[11px]">FBR POS Registration ID *</label>
                  <input
                    type="text"
                    required={tenant.enable_fbr_integration}
                    value={tenant.fbr_pos_id || ''}
                    onChange={e => setTenant({ ...tenant, fbr_pos_id: e.target.value })}
                    placeholder="e.g. POS-KRUNCHY-001"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white font-mono text-xs"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Schedule Builder */}
          <div className="pt-4 border-t border-gray-700 space-y-3">
            <span className="text-[11px] text-emerald-400 uppercase font-bold tracking-wider">Professional Weekly Schedule (Split-Shift Enabled)</span>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-700 space-y-3">
              {editSchedule.map((item, idx) => (
                <div key={item.day} className="bg-black/40 rounded-xl p-3 border border-gray-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs w-24">{item.day}</span>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center space-x-1.5 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={item.closed} 
                          onChange={e => {
                            const updated = [...editSchedule]
                            updated[idx].closed = e.target.checked
                            setEditSchedule(updated)
                          }}
                          className="rounded bg-gray-800 border-gray-700 text-emerald-600 focus:ring-0" 
                        />
                        <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Mark Closed</span>
                      </label>
                      {!item.closed && (
                        <label className="flex items-center space-x-1.5 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={item.split} 
                            onChange={e => {
                              const updated = [...editSchedule]
                              updated[idx].split = e.target.checked
                              if (e.target.checked && !updated[idx].from2) {
                                updated[idx].from2 = '04:00 PM'
                                updated[idx].to2 = '10:00 PM'
                              }
                              setEditSchedule(updated)
                            }}
                            className="rounded bg-gray-800 border-gray-700 text-amber-500 focus:ring-0" 
                          />
                          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Split Shift</span>
                        </label>
                      )}
                    </div>
                  </div>

                  {!item.closed && (
                    <div className="space-y-2 pt-1 border-t border-gray-800/80">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-semibold text-gray-400 w-14">Shift 1</span>
                        <input type="text" value={item.from} onChange={e => { const up = [...editSchedule]; up[idx].from = e.target.value; setEditSchedule(up); }} className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1 text-white flex-1 font-mono text-[11px]" />
                        <span className="text-gray-500 text-[10px]">to</span>
                        <input type="text" value={item.to} onChange={e => { const up = [...editSchedule]; up[idx].to = e.target.value; setEditSchedule(up); }} className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1 text-white flex-1 font-mono text-[11px]" />
                      </div>
                      {item.split && (
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-semibold text-amber-400/90 w-14">Shift 2</span>
                          <input type="text" value={item.from2} onChange={e => { const up = [...editSchedule]; up[idx].from2 = e.target.value; setEditSchedule(up); }} className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1 text-white flex-1 font-mono text-[11px]" />
                          <span className="text-gray-500 text-[10px]">to</span>
                          <input type="text" value={item.to2} onChange={e => { const up = [...editSchedule]; up[idx].to2 = e.target.value; setEditSchedule(up); }} className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1 text-white flex-1 font-mono text-[11px]" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contact Person Details */}
          <div className="pt-4 border-t border-gray-700 space-y-3">
            <span className="text-[11px] text-emerald-400 uppercase font-bold tracking-wider">Contact Person Details</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-gray-400 font-medium mb-1">Contact Name</label>
                <input type="text" value={tenant.contact_person_name || ''} onChange={e => setTenant({ ...tenant, contact_person_name: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-gray-400 font-medium mb-1">Contact Phone</label>
                <input type="text" value={tenant.contact_person_phone || ''} onChange={e => setTenant({ ...tenant, contact_person_phone: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-gray-400 font-medium mb-1">Contact Email</label>
                <input type="email" value={tenant.contact_person_email || ''} onChange={e => setTenant({ ...tenant, contact_person_email: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white" />
              </div>
            </div>
          </div>

          <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow">
            Save Tenant Profile & Fiscal Configuration 💾
          </button>
        </form>

        {/* Credentials & Users Section */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-md space-y-5">
          <div className="flex justify-between items-center">
            <span className="text-sm text-emerald-400 uppercase font-bold tracking-wider">Store User Credentials & Logins</span>
            {editingUserId && (
              <button onClick={() => { setEditingUserId(null); setNewTenantUser(''); setNewTenantPass(''); }} className="text-xs text-gray-400 hover:text-white underline">Cancel Edit</button>
            )}
          </div>

          <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/40 text-gray-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Username</th>
                  <th className="p-3">Password</th>
                  <th className="p-3">Role</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {tenantUsers.length > 0 ? tenantUsers.map(u => (
                  <tr key={u.id}>
                    <td className="p-3 font-mono text-white">{u.username}</td>
                    <td className="p-3 font-mono text-gray-300">{u.password_hash}</td>
                    <td className="p-3 uppercase text-gray-300 font-semibold">{u.role}</td>
                    <td className="p-3 text-right space-x-2">
                      <button onClick={() => { setEditingUserId(u.id); setNewTenantUser(u.username); setNewTenantPass(u.password_hash); setNewTenantRole(u.role); }} className="text-blue-400 hover:text-blue-300 font-bold">Edit</button>
                      <button onClick={() => handleDeleteTenantUser(u.id)} className="text-red-400 hover:text-red-300 font-bold">Delete</button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="text-center py-4 text-gray-500">No store logins created yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <form onSubmit={handleSaveTenantUser} className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-2 items-end">
            <div>
              <label className="block text-gray-400 font-medium mb-1 text-[10px]">Username</label>
              <input type="text" placeholder="manager" value={newTenantUser} onChange={e => setNewTenantUser(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white text-xs" required />
            </div>
            <div>
              <label className="block text-gray-400 font-medium mb-1 text-[10px]">Password</label>
              <input type="text" placeholder="password" value={newTenantPass} onChange={e => setNewTenantPass(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white font-mono text-xs" required />
            </div>
            <div>
              <label className="block text-gray-400 font-medium mb-1 text-[10px]">Role</label>
              <select value={newTenantRole} onChange={e => setNewTenantRole(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white uppercase text-xs">
                <option value="owner">Owner</option>
                <option value="manager">Manager</option>
                <option value="cashier">Cashier</option>
              </select>
            </div>
            <button type="submit" className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow text-xs">
              {editingUserId ? 'Update Login 💾' : '+ Add Login'}
            </button>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-950/20 p-6 rounded-2xl border border-red-900/30 flex justify-between items-center">
          <div>
            <span className="text-xs text-red-400 uppercase font-extrabold tracking-wider block">⚠️ Danger Zone: Delete Tenant</span>
            <span className="text-[11px] text-gray-400">Permanently remove this tenant instance and all associated data from the ecosystem.</span>
          </div>
          <button type="button" onClick={handleDeleteTenant} className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition shadow text-xs whitespace-nowrap">
            Delete Tenant Instance 🗑️
          </button>
        </div>
      </main>
    </div>
  )
}