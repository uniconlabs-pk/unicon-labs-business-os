'use client'

import { useState, useEffect, use, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { getBusinessProfile } from '@/lib/businessProfiles'
import { QRCodeSVG } from 'qrcode.react'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function TenantDashboard({ params }: PageProps) {
  const { slug } = use(params)
  const router = useRouter()

  const [business, setBusiness] = useState<any>(null)
  const [stats, setStats] = useState({ productsCount: 0, categoriesCount: 0, tablesCount: 0, staffCount: 0 })
  const [loading, setLoading] = useState(true)

  // Settings Drawer State
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)

  // Reports & Database Full-Screen View State & Collapsible Menu State
  const [activeReportView, setActiveReportView] = useState<'sales' | 'sales_returns' | 'customers' | 'staff' | null>(null)
  const [isReportsMenuOpen, setIsReportsMenuOpen] = useState(false)
  
  // Reports Filter States
  const [salesReportData, setSalesReportData] = useState<any[]>([])
  const [loadingSales, setLoadingSales] = useState(false)
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterCustQuery, setFilterCustQuery] = useState('')
  const [filterOrderNo, setFilterOrderNo] = useState('')
  const [filterOrderType, setFilterOrderType] = useState('ALL')
  const [filterPaymentMode, setFilterPaymentMode] = useState('ALL')
  const [filterWaiterName, setFilterWaiterName] = useState('')
  const [filterRiderName, setFilterRiderName] = useState('')

  // Sales Return Report View & Filter States
  const [salesReturnData, setSalesReturnData] = useState<any[]>([])
  const [loadingSalesReturns, setLoadingSalesReturns] = useState(false)
  const [filterSrrDateFrom, setFilterSrrDateFrom] = useState('')
  const [filterSrrDateTo, setFilterSrrDateTo] = useState('')
  const [filterSrrNo, setFilterSrrNo] = useState('')
  const [filterSrrOrderNo, setFilterSrrOrderNo] = useState('')
  const [filterSrrOrderType, setFilterSrrOrderType] = useState('ALL')
  const [filterSrrItem, setFilterSrrItem] = useState('')
  const [filterSrrAuthorizedBy, setFilterSrrAuthorizedBy] = useState('')

  // Customer Database States
  const [customerList, setCustomerList] = useState<any[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [filterCustName, setFilterCustName] = useState('')
  const [filterCustPhone, setFilterCustPhone] = useState('')
  const [filterCustOrigin, setFilterCustOrigin] = useState('ALL')

  // Staff Database States
  const [staffFilterId, setStaffFilterId] = useState('')
  const [staffFilterName, setStaffFilterName] = useState('')
  const [staffFilterRole, setStaffFilterRole] = useState('ALL')
  const [staffFilterDept, setStaffFilterDept] = useState('ALL')

  // Tenant-Level Granular Module Overrides
  const [editHasPos, setEditHasPos] = useState(true)
  const [editHasKds, setEditHasKds] = useState(false)
  const [editHasDispatchQueue, setEditHasDispatchQueue] = useState(true)
  const [editHasStorefront, setEditHasStorefront] = useState(true)
  const [editHasErp, setEditHasErp] = useState(true)
  const [editHasTables, setEditHasTables] = useState(false)

  // Staff Management Drawer State (Right slide-over, ~35% screen size)
  const [showStaffDrawer, setShowStaffDrawer] = useState(false)
  const [staffList, setStaffList] = useState<any[]>([])
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null)
  const [newStaffName, setNewStaffName] = useState('')
  const [newStaffRole, setNewStaffRole] = useState('Cashier')
  const [newStaffPin, setNewStaffPin] = useState('')
  const [staffPos, setStaffPos] = useState(true)
  const [staffKds, setStaffKds] = useState(false)
  const [staffErp, setStaffErp] = useState(false)
  const [savingStaff, setSavingStaff] = useState(false)
  const [badgePreviewStaff, setBadgePreviewStaff] = useState<any | null>(null)

  // Active POS Sessions Management State (Step 2)
  const [activeSessionsList, setActiveSessionsList] = useState<any[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)

  // Extended Staff Profile Fields & Dynamic Management States
  const [newStaffCode, setNewStaffCode] = useState('')
  const [newStaffDept, setNewStaffDept] = useState('General')
  const [newStaffCustomToken, setNewStaffCustomToken] = useState('')

  // Concern 1 & 2: Dynamic Departments & Roles States
  const [departments, setDepartments] = useState<string[]>(['General', 'Kitchen', 'Service', 'Management'])
  const [newDeptInput, setNewDeptInput] = useState('')
  const [roles, setRoles] = useState<string[]>(['Cashier', 'Chef / Kitchen', 'Store Manager', 'Admin', 'Waiter', 'Delivery Rider'])
  const [newRoleInput, setNewRoleInput] = useState('')

  const generateDefaultStaffCode = () => {
    const randNum = Math.floor(100 + Math.random() * 900)
    return `STF-${slug.slice(0, 4).toUpperCase()}-${randNum}`
  }

  // Editable Business Settings Fields
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState('restaurant')
  const [editLogoUrl, setEditLogoUrl] = useState('')
  const [editBannerUrl, setEditBannerUrl] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editWebUrl, setEditWebUrl] = useState('')

  // Sequence Starting Points Configuration State
  const [editNextOrderSeq, setEditNextOrderSeq] = useState<string>('100000')
  const [editNextSerialSeq, setEditNextSerialSeq] = useState<string>('100000')
  const [editNextKotSeq, setEditNextKotSeq] = useState<string>('100000')
  const [editNextSrrSeq, setEditNextSrrSeq] = useState<string>('100000')

  // Fetch Active Sessions with direct staff profile join for instant, accurate details
  const fetchActiveSessions = async (businessId: string) => {
    if (!businessId) return
    setLoadingSessions(true)

    const { data, error } = await supabase
      .from('active_pos_sessions')
      .select(`
        id,
        staff_id,
        last_heartbeat_at,
        business_id,
        staff_profiles (
          id,
          full_name,
          role,
          department,
          staff_code
        )
      `)
      .eq('business_id', businessId)

    if (error) {
      console.error('Error fetching active sessions:', error.message)
    } else {
      const mappedSessions = (data || []).map(sess => ({
        ...sess,
        staff_profiles: Array.isArray(sess.staff_profiles) ? sess.staff_profiles[0] || {} : sess.staff_profiles || {}
      }))
      setActiveSessionsList(mappedSessions)
    }
    setLoadingSessions(false)
  }

  // Force Logout Active Session Handler (Step 2)
  const handleForceLogoutSession = async (sessionId: string, staffName: string) => {
    if (!confirm(`Are you sure you want to force logout ${staffName || 'this staff member'}? This will immediately terminate their active POS session and release the device lock.`)) return
    
    const { error } = await supabase
      .from('active_pos_sessions')
      .delete()
      .eq('id', sessionId)

    if (error) {
      alert(`Failed to terminate session: ${error.message}`)
    } else {
      alert(`Session terminated successfully for ${staffName}.`)
      if (business?.id) {
        fetchActiveSessions(business.id)
      }
    }
  }

  useEffect(() => {
    const rawSession = localStorage.getItem(`tenant_session_${slug}`)
    if (!rawSession) {
      router.push(`/${slug}/login`)
      return
    }

    async function fetchTenantData() {
      const { data: biz, error: bizErr } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .single()

      if (bizErr || !biz) {
        console.error('Tenant fetch error:', bizErr?.message)
        router.push('/')
        return
      }

      setBusiness(biz)
      setEditName(biz.name || '')
      setEditType(biz.business_type || 'restaurant')
      setEditLogoUrl(biz.logo_url || '')
      setEditBannerUrl(biz.banner_url || '')
      setEditAddress(biz.address || '')
      setEditPhone(biz.phone || '')
      setEditEmail(biz.email || '')
      setEditWebUrl(biz.web_url || '')
      setEditNextOrderSeq(String(biz.next_order_seq ?? 100000))
      setEditNextSerialSeq(String(biz.next_serial_seq ?? 100000))
      setEditNextKotSeq(String(biz.next_kot_seq ?? 100000))
      setEditNextSrrSeq(String(biz.next_srr_seq ?? 100000))

      // Dynamically update browser tab title to Tenant Name
      if (biz.name) {
        document.title = biz.name
      }

      const prof = getBusinessProfile(biz.business_type)
      setEditHasPos(biz.has_pos ?? true)
      setEditHasKds(biz.has_kds ?? prof.modules.hasKDS)
      setEditHasDispatchQueue(biz.has_dispatch_queue ?? prof.modules.hasDispatchQueue ?? true)
      setEditHasStorefront(biz.has_storefront ?? true)
      setEditHasErp(biz.has_erp ?? true)
      setEditHasTables(biz.has_tables ?? prof.modules.hasTables)

      const [{ count: pCount }, { count: cCount }, { count: tCount }, { count: sCount, data: sData }] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('business_id', biz.id),
        supabase.from('categories').select('*', { count: 'exact', head: true }).eq('business_id', biz.id),
        supabase.from('tables').select('*', { count: 'exact', head: true }).eq('business_id', biz.id),
        supabase.from('staff_profiles').select('*', { count: 'exact' }).eq('business_id', biz.id)
      ])

      setStats({
        productsCount: pCount || 0,
        categoriesCount: cCount || 0,
        tablesCount: tCount || 0,
        staffCount: sCount || 0
      })

      if (sData) setStaffList(sData)
      
      // Fetch active sessions on load
      fetchActiveSessions(biz.id)

      setLoading(false)
    }

    fetchTenantData()
  }, [slug, router])

  // Fetch Sales Report Data
  const fetchSalesReport = async () => {
    if (!business?.id) return
    setLoadingSales(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setSalesReportData(data)
    }
    setLoadingSales(false)
  }

  // Fetch Sales Return Report Data
  const fetchSalesReturnsReport = async () => {
    if (!business?.id) return
    setLoadingSalesReturns(true)
    const { data, error } = await supabase
      .from('sales_returns')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setSalesReturnData(data)
    }
    setLoadingSalesReturns(false)
  }

  // Fetch Customer Database Data
  const fetchCustomerDatabase = async () => {
    if (!business?.id) return
    setLoadingCustomers(true)
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', business.id)
      .order('updated_at', { ascending: false })

    if (!error && data) {
      setCustomerList(data)
    }
    setLoadingCustomers(false)
  }

  // Handle Opening Reports Full-Screen Views
  const selectReportView = (type: 'sales' | 'sales_returns' | 'customers' | 'staff' | null) => {
    setActiveReportView(type)
    if (type === 'sales') fetchSalesReport()
    if (type === 'sales_returns') fetchSalesReturnsReport()
    if (type === 'customers') fetchCustomerDatabase()
  }

  // Filtered Sales Report Computed Data
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

  // Filtered Sales Return Computed Data
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

  // Filtered Customer Database Computed Data
  const filteredCustomers = useMemo(() => {
    return customerList.filter(cust => {
      if (filterCustName.trim()) {
        if (!(cust.name || '').toLowerCase().includes(filterCustName.trim().toLowerCase())) return false
      }
      if (filterCustPhone.trim()) {
        if (!(cust.phone || '').includes(filterCustPhone.trim())) return false
      }
      if (filterCustOrigin !== 'ALL') {
        if ((cust.origin || 'POS').toUpperCase() !== filterCustOrigin.toUpperCase()) return false
      }
      return true
    })
  }, [customerList, filterCustName, filterCustPhone, filterCustOrigin])

  // Filtered Staff Database Computed Data
  const filteredStaffDatabase = useMemo(() => {
    return staffList.filter(st => {
      if (staffFilterId.trim()) {
        if (!(st.staff_code || st.id || '').toLowerCase().includes(staffFilterId.trim().toLowerCase())) return false
      }
      if (staffFilterName.trim()) {
        if (!(st.full_name || '').toLowerCase().includes(staffFilterName.trim().toLowerCase())) return false
      }
      if (staffFilterRole !== 'ALL') {
        if ((st.role || '').toLowerCase() !== staffFilterRole.toLowerCase()) return false
      }
      if (staffFilterDept !== 'ALL') {
        if ((st.department || '').toLowerCase() !== staffFilterDept.toLowerCase()) return false
      }
      return true
    })
  }, [staffList, staffFilterId, staffFilterName, staffFilterRole, staffFilterDept])

  // REAL-TIME WEBSOCKET SUBSCRIPTION FOR TENANT DASHBOARD & ACTIVE SESSIONS SYNC
  useEffect(() => {
    if (!business?.id) return

    const channel = supabase
      .channel(`tenant-dashboard-live-${business.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'businesses',
          filter: `id=eq.${business.id}`,
        },
        (payload) => {
          const updatedBiz = payload.new
          setBusiness(updatedBiz)
          setEditName(updatedBiz.name || '')
          setEditType(updatedBiz.business_type || 'restaurant')
          setEditLogoUrl(updatedBiz.logo_url || '')
          setEditBannerUrl(updatedBiz.banner_url || '')
          setEditAddress(updatedBiz.address || '')
          setEditPhone(updatedBiz.phone || '')
          setEditEmail(updatedBiz.email || '')
          setEditWebUrl(updatedBiz.web_url || '')
          setEditHasPos(updatedBiz.has_pos ?? true)
          setEditHasKds(updatedBiz.has_kds ?? false)
          setEditHasDispatchQueue(updatedBiz.has_dispatch_queue ?? true)
          setEditHasStorefront(updatedBiz.has_storefront ?? true)
          setEditHasErp(updatedBiz.has_erp ?? true)
          setEditHasTables(updatedBiz.has_tables ?? false)
          setEditNextOrderSeq(String(updatedBiz.next_order_seq ?? 100000))
          setEditNextSerialSeq(String(updatedBiz.next_serial_seq ?? 100000))
          setEditNextKotSeq(String(updatedBiz.next_kot_seq ?? 100000))
          setEditNextSrrSeq(String(updatedBiz.next_srr_seq ?? 100000))
          
          if (updatedBiz.name) {
            document.title = updatedBiz.name
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_pos_sessions',
        },
        () => {
          // Automatically refresh active sessions on any insert, update, or delete event across active sessions
          fetchActiveSessions(business.id)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sales_returns',
          filter: `business_id=eq.${business.id}`,
        },
        (payload) => {
          setSalesReturnData(prev => [payload.new, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [business?.id])

  const profile = getBusinessProfile(business?.business_type)
  const isPharmacy = business?.business_type?.toLowerCase() === 'pharmacy' || profile.typeKey === 'pharmacy'

  const effectiveModules = {
    hasPOS: business?.has_pos ?? profile.modules.hasPOS,
    hasKDS: business?.has_kds ?? profile.modules.hasKDS,
    hasDispatchQueue: business?.has_dispatch_queue ?? profile.modules.hasDispatchQueue ?? true,
    hasStorefront: business?.has_storefront ?? true,
    hasERP: business?.has_erp ?? true,
    hasTables: isPharmacy ? false : (business?.has_tables ?? profile.modules.hasTables),
  }

  const handleSignOut = () => {
    localStorage.removeItem(`tenant_session_${slug}`)
    router.push(`/${slug}/login`)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `logo-${Date.now()}.${fileExt}`
    const filePath = `${slug}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, file)

    if (uploadError) {
      alert(`Logo upload failed: ${uploadError.message}`)
      setUploadingLogo(false)
      return
    }

    const { data } = supabase.storage.from('products').getPublicUrl(filePath)
    if (data?.publicUrl) {
      setEditLogoUrl(data.publicUrl)
    }
    setUploadingLogo(false)
  }

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingBanner(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `banner-${Date.now()}.${fileExt}`
    const filePath = `${slug}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, file)

    if (uploadError) {
      alert(`Banner upload failed: ${uploadError.message}`)
      setUploadingBanner(false)
      return
    }

    const { data } = supabase.storage.from('products').getPublicUrl(filePath)
    if (data?.publicUrl) {
      setEditBannerUrl(data.publicUrl)
    }
    setUploadingBanner(false)
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!business) return

    const parsedOrderSeq = parseInt(editNextOrderSeq) || 100000
    const parsedSerialSeq = parseInt(editNextSerialSeq) || 100000
    const parsedKotSeq = parseInt(editNextKotSeq) || 100000
    const parsedSrrSeq = parseInt(editNextSrrSeq) || 100000

    setSavingSettings(true)
    const { error } = await supabase
      .from('businesses')
      .update({
        name: editName,
        business_type: editType,
        logo_url: editLogoUrl ? editLogoUrl.trim() : null,
        banner_url: editBannerUrl ? editBannerUrl.trim() : null,
        address: editAddress,
        phone: editPhone,
        email: editEmail,
        web_url: editWebUrl,
        has_pos: editHasPos,
        has_kds: editHasKds,
        has_dispatch_queue: editHasDispatchQueue,
        has_storefront: editHasStorefront,
        has_erp: editHasErp,
        has_tables: editHasTables,
        next_order_seq: parsedOrderSeq,
        next_serial_seq: parsedSerialSeq,
        next_kot_seq: parsedKotSeq,
        next_srr_seq: parsedSrrSeq
      })
      .eq('id', business.id)

    if (error) {
      alert(`Failed to update business settings: ${error.message}`)
    } else {
      alert('Business credentials & sequence starting points updated successfully!')
      setBusiness({
        ...business,
        name: editName,
        business_type: editType,
        logo_url: editLogoUrl,
        banner_url: editBannerUrl,
        address: editAddress,
        phone: editPhone,
        email: editEmail,
        web_url: editWebUrl,
        has_pos: editHasPos,
        has_kds: editHasKds,
        has_dispatch_queue: editHasDispatchQueue,
        has_storefront: editHasStorefront,
        has_erp: editHasErp,
        has_tables: editHasTables,
        next_order_seq: parsedOrderSeq,
        next_serial_seq: parsedSerialSeq,
        next_kot_seq: parsedKotSeq,
        next_srr_seq: parsedSrrSeq
      })
      if (editName) {
        document.title = editName
      }
      setShowSettingsDrawer(false)
    }
    setSavingSettings(false)
  }

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!business || !newStaffName || !newStaffPin) {
      alert('Please fill in staff name and 4/6-digit security PIN.')
      return
    }

    setSavingStaff(true)

    const finalAccessPos = effectiveModules.hasPOS ? staffPos : false
    const finalAccessKds = effectiveModules.hasKDS ? staffKds : false
    const finalAccessErp = effectiveModules.hasERP ? staffErp : false
    const finalStaffCode = newStaffCode.trim() || generateDefaultStaffCode()
    const finalStaffDept = newStaffDept.trim() || 'General'
    const uniqueQrToken = `STAFF-${slug.slice(0, 4).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    const finalQrToken = newStaffCustomToken.trim() || uniqueQrToken

    if (editingStaffId) {
      const { error } = await supabase.from('staff_profiles').update({
        full_name: newStaffName.trim(),
        role: newStaffRole,
        pin_code: newStaffPin.trim(),
        staff_code: finalStaffCode,
        department: finalStaffDept,
        access_pos: finalAccessPos,
        access_kds: finalAccessKds,
        access_erp: finalAccessErp
      }).eq('id', editingStaffId)

      if (error) {
        alert(`Failed to update staff: ${error.message}`)
      } else {
        alert('Staff profile updated successfully!')
        resetStaffForm()
      }
    } else {
      const { error } = await supabase.from('staff_profiles').insert([{
        business_id: business.id,
        full_name: newStaffName.trim(),
        role: newStaffRole,
        pin_code: newStaffPin.trim(),
        staff_code: finalStaffCode,
        department: finalStaffDept,
        qr_token: finalQrToken,
        access_pos: finalAccessPos,
        access_kds: finalAccessKds,
        access_erp: finalAccessErp
      }])

      if (error) {
        alert(`Failed to add staff: ${error.message}`)
      } else {
        alert('Staff member registered successfully with security PIN & QR ID badge token!')
        resetStaffForm()
      }
    }

    const { data: refreshedStaff } = await supabase.from('staff_profiles').select('*').eq('business_id', business.id)
    if (refreshedStaff) {
      setStaffList(refreshedStaff)
      setStats(prev => ({ ...prev, staffCount: refreshedStaff.length }))
    }
    setSavingStaff(false)
  }

  const handleEditStaffClick = (st: any) => {
    setEditingStaffId(st.id)
    setNewStaffName(st.full_name)
    setNewStaffRole(st.role)
    setNewStaffPin(st.pin_code)
    setNewStaffCode(st.staff_code || '')
    setNewStaffDept(st.department || 'General')
    setNewStaffCustomToken(st.qr_token || '')
    setStaffPos(st.access_pos)
    setStaffKds(st.access_kds)
    setStaffErp(st.access_erp)
  }

  const resetStaffForm = () => {
    setEditingStaffId(null)
    setNewStaffName('')
    setNewStaffPin('')
    setNewStaffRole(roles[0] || 'Cashier')
    setNewStaffCode('')
    setNewStaffDept(departments[0] || 'General')
    setNewStaffCustomToken('')
    setStaffPos(true)
    setStaffKds(false)
    setStaffErp(false)
  }

  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return
    const { error } = await supabase.from('staff_profiles').delete().eq('id', staffId)
    if (!error) {
      setStaffList(staffList.filter(s => s.id !== staffId))
      setStats(prev => ({ ...prev, staffCount: prev.staffCount - 1 }))
      if (editingStaffId === staffId) resetStaffForm()
    } else {
      alert(`Failed to delete staff: ${error.message}`)
    }
  }

  const handleAddDepartment = () => {
    const trimmed = newDeptInput.trim()
    if (!trimmed) return
    if (departments.includes(trimmed)) {
      alert('Department already exists.')
      return
    }
    setDepartments([...departments, trimmed])
    setNewStaffDept(trimmed)
    setNewDeptInput('')
  }

  const handleRemoveDepartment = (deptToRemove: string) => {
    if (departments.length <= 1) {
      alert('You must have at least one department.')
      return
    }
    setDepartments(departments.filter(d => d !== deptToRemove))
    if (newStaffDept === deptToRemove) {
      setNewStaffDept(departments.find(d => d !== deptToRemove) || 'General')
    }
  }

  const handleAddRole = () => {
    const trimmed = newRoleInput.trim()
    if (!trimmed) return
    if (roles.includes(trimmed)) {
      alert('Role already exists.')
      return
    }
    setRoles([...roles, trimmed])
    setNewStaffRole(trimmed)
    setNewRoleInput('')
  }

  const handleRemoveRole = (roleToRemove: string) => {
    if (roles.length <= 1) {
      alert('You must have at least one role.')
      return
    }
    setRoles(roles.filter(r => r !== roleToRemove))
    if (newStaffRole === roleToRemove) {
      setNewStaffRole(roles.find(r => r !== roleToRemove) || 'Cashier')
    }
  }

  const downloadQrBadgePng = () => {
    if (!badgePreviewStaff) return
    const svgEl = document.querySelector('#staff-qr-badge-svg svg')
    if (!svgEl) return

    const svgData = new XMLSerializer().serializeToString(svgEl)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const URLObj = window.URL || window.webkitURL || window
    const blobURL = URLObj.createObjectURL(svgBlob)

    const image = new Image()
    image.onload = () => {
      const scale = 2
      const canvas = document.createElement('canvas')
      canvas.width = 400 * scale
      canvas.height = 540 * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(scale, scale)

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 400, 540)

      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 1.5
      ctx.strokeRect(1, 1, 398, 538)

      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, 400, 95)

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 18px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText((business?.name || slug).toUpperCase(), 200, 42)

      ctx.fillStyle = '#94a3b8'
      ctx.font = '11px sans-serif'
      ctx.fillText('OFFICIAL SECURITY & ACCESS BADGE', 200, 68)

      ctx.fillStyle = '#0f172a'
      ctx.font = 'bold 24px sans-serif'
      ctx.fillText(badgePreviewStaff.full_name || 'STAFF', 200, 155)

      ctx.fillStyle = '#e0e7ff'
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(130, 172, 140, 26, 13)
      } else {
        ctx.rect(130, 172, 140, 26)
      }
      ctx.fill()
      ctx.fillStyle = '#4338ca'
      ctx.font = 'bold 12px sans-serif'
      ctx.fillText((badgePreviewStaff.role || 'STAFF').toUpperCase(), 200, 189)

      ctx.fillStyle = '#f8fafc'
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 1
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(110, 218, 180, 42, 8)
      } else {
        ctx.rect(110, 218, 180, 42)
      }
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = '#334155'
      ctx.font = 'bold 14px monospace'
      ctx.fillText(`PIN: ${badgePreviewStaff.pin_code || '----'}`, 200, 244)

      ctx.drawImage(image, 100, 280, 200, 200)

      ctx.fillStyle = '#475569'
      ctx.font = 'bold 11px monospace'
      ctx.fillText(badgePreviewStaff.qr_token || '', 200, 505)

      const pngUrl = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.href = pngUrl
      downloadLink.download = `${(business?.slug || 'tenant').toUpperCase()}-BADGE-${(badgePreviewStaff.full_name || 'STAFF').replace(/\s+/g, '-')}.png`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
      URLObj.revokeObjectURL(blobURL)
    }
    image.src = blobURL
  }

  const getBannerBackground = (type: string) => {
    const normalized = (type || '').toLowerCase().trim()
    if (normalized.includes('restaurant') || normalized.includes('food')) {
      return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=80'
    } else if (normalized.includes('pharmacy') || normalized.includes('medical')) {
      return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1600&q=80'
    } else if (normalized.includes('perfumery') || normalized.includes('fragrance')) {
      return 'https://images.unsplash.com/photo-1615397349754-cfa2066a298e?auto=format&fit=crop&w=1600&q=80'
    } else if (normalized.includes('building') || normalized.includes('hardware') || normalized.includes('materials')) {
      return 'https://images.unsplash.com/photo-1541888946425-d0fbb18f8f3c?auto=format&fit=crop&w=1600&q=80'
    } else {
      return 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-gray-700">
        Loading {slug} Ecosystem...
      </div>
    )
  }

  if (business?.subscription_status === 'suspended') {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4 font-sans">
        <div className="bg-red-950/40 border border-red-900/60 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl backdrop-blur-md">
          <div className="w-16 h-16 bg-red-600 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg">
            🚫
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-black uppercase tracking-wider text-red-400">Account Suspended</h1>
            <p className="text-xs text-gray-300">
              The store <span className="font-bold text-white">{business?.name}</span> has been temporarily suspended by the Master Administrator.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => {
                localStorage.removeItem(`tenant_session_${slug}`)
                router.push(`/${slug}/login`)
              }}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow"
            >
              Sign Out & Return Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  const activeBannerImg = business?.banner_url && business.banner_url.trim() !== '' 
    ? business.banner_url 
    : getBannerBackground(business?.business_type)

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 flex flex-row h-screen overflow-hidden font-sans select-none text-xs">
      
      {/* LEFT MEGA MENU SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white border-r border-slate-800 flex flex-col shrink-0 justify-between shadow-lg z-20 overflow-y-auto">
        <div className="p-5 space-y-6">
          {/* Brand header */}
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
            <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-inner overflow-hidden">
              {business?.logo_url ? (
                <img src={business.logo_url} alt={business.name} className="w-full h-full object-contain bg-white" />
              ) : (
                <span>🏢</span>
              )}
            </div>
            <div className="overflow-hidden">
              <h1 className="text-xs font-black uppercase tracking-wide text-white truncate">{business?.name || 'Dashboard'}</h1>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${profile.badgeColor}`}>
                {profile.displayName}
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            <a 
              href={`/${slug}`} 
              onClick={() => selectReportView(null)}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition shadow-2xs ${
                activeReportView === null ? 'bg-slate-800 text-white' : 'text-gray-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>🏠</span>
              <span>HOME</span>
            </a>

            {effectiveModules.hasPOS && (
              <a 
                href={`/${slug}/pos`} 
                className="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-gray-300 hover:bg-slate-800 hover:text-white font-semibold text-xs transition"
              >
                <span>🖥️</span>
                <span>POS Controls</span>
              </a>
            )}

            {effectiveModules.hasKDS && (
              <a 
                href={`/${slug}/kds`} 
                className="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-gray-300 hover:bg-slate-800 hover:text-white font-semibold text-xs transition"
              >
                <span>🍳</span>
                <span>KDS Controls</span>
              </a>
            )}

            {effectiveModules.hasDispatchQueue && (
              <a 
                href={`/${slug}/dispatch`} 
                className="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-gray-300 hover:bg-slate-800 hover:text-white font-semibold text-xs transition"
              >
                <span>📦</span>
                <span>DISPATCH Controls</span>
              </a>
            )}

            {effectiveModules.hasStorefront && (
              <a 
                href={`/${slug}/storefront`} 
                className="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-gray-300 hover:bg-slate-800 hover:text-white font-semibold text-xs transition"
              >
                <span>🛍</span>
                <span>STOREFRONT Controls</span>
              </a>
            )}

            {effectiveModules.hasERP && (
              <a 
                href={`/${slug}/finance`} 
                className="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-gray-300 hover:bg-slate-800 hover:text-white font-semibold text-xs transition"
              >
                <span>📊</span>
                <span>ERP Controls</span>
              </a>
            )}

            {/* Reports & Database Collapsible Category Section */}
            <div className="pt-2 pb-1">
              <button 
                onClick={() => setIsReportsMenuOpen(!isReportsMenuOpen)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-gray-300 hover:bg-slate-800 hover:text-white font-semibold text-xs transition cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <span>📂</span>
                  <span>Reports & Database</span>
                </div>
                <span className="text-[10px] font-mono">{isReportsMenuOpen ? '▼' : '▶'}</span>
              </button>

              {isReportsMenuOpen && (
                <div className="space-y-1 pl-4 pt-1 border-l-2 border-slate-700 ml-3.5 mt-1">
                  <button 
                    onClick={() => selectReportView('sales')}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg font-medium text-[11px] transition text-left cursor-pointer ${
                      activeReportView === 'sales' ? 'bg-emerald-600 text-white font-bold' : 'text-gray-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span>📈</span>
                    <span>Sales Report</span>
                  </button>
                  <button 
                    onClick={() => selectReportView('sales_returns')}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg font-medium text-[11px] transition text-left cursor-pointer ${
                      activeReportView === 'sales_returns' ? 'bg-emerald-600 text-white font-bold' : 'text-gray-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span>🔄</span>
                    <span>Sales Return Report</span>
                  </button>
                  <button 
                    onClick={() => selectReportView('customers')}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg font-medium text-[11px] transition text-left cursor-pointer ${
                      activeReportView === 'customers' ? 'bg-emerald-600 text-white font-bold' : 'text-gray-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span>👥</span>
                    <span>Customer Database</span>
                  </button>
                  <button 
                    onClick={() => selectReportView('staff')}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg font-medium text-[11px] transition text-left cursor-pointer ${
                      activeReportView === 'staff' ? 'bg-emerald-600 text-white font-bold' : 'text-gray-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span>🆔</span>
                    <span>Staff Database</span>
                  </button>
                </div>
              )}
            </div>

            <button 
              onClick={() => setShowSettingsDrawer(true)}
              className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-gray-300 hover:bg-slate-800 hover:text-white font-semibold text-xs transition text-left cursor-pointer mt-1"
            >
              <span>⚙</span>
              <span>General Settings</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <button 
            onClick={handleSignOut}
            className="w-full py-2 bg-slate-800 hover:bg-red-900/60 text-gray-300 hover:text-white rounded-xl font-bold text-xs transition flex items-center justify-center space-x-2"
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-gray-100">
        
        {/* TOP HEADER */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shrink-0 shadow-2xs">
          <div>
            <h2 className="text-sm font-black uppercase text-gray-900 tracking-wide">
              {activeReportView === null && 'Command Center & Operations'}
              {activeReportView === 'sales' && 'Advanced Sales Report & Audit Hub'}
              {activeReportView === 'sales_returns' && 'Sales Return Passes & Audit Hub'}
              {activeReportView === 'customers' && 'Customer Database & CRM Directory'}
              {activeReportView === 'staff' && 'Staff Directory & Security Badge Hub'}
            </h2>
            <p className="text-[11px] text-gray-500">Tenant Slug: <span className="font-mono font-bold text-gray-800">{slug}</span></p>
          </div>
          <div className="flex items-center space-x-3">
            {activeReportView !== null && (
              <button 
                onClick={() => selectReportView(null)}
                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                ← Back to Home Dashboard
              </button>
            )}
            <button 
              onClick={() => setShowSettingsDrawer(true)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs transition shadow-2xs flex items-center space-x-1 cursor-pointer"
            >
              <span>⚙️</span>
              <span>Settings</span>
            </button>
          </div>
        </header>

        {/* DASHBOARD BODY OR FULL-SCREEN REPORT VIEW */}
        <main className="flex-1 px-8 pt-4 pb-8 max-w-7xl mx-auto w-full space-y-4">
          
          {activeReportView === null ? (
            <>
              {/* WELCOME BANNER */}
              <div 
                className="text-white px-7 py-6 rounded-3xl shadow-md flex justify-between items-center bg-cover bg-right border border-black/10 relative overflow-hidden min-h-[175px]"
                style={{
                  backgroundImage: `linear-gradient(to right, rgba(0, 0, 0, 0.98) 40%, rgba(0, 0, 0, 0.55) 75%, rgba(0, 0, 0, 0.2) 100%), url('${activeBannerImg}')`
                }}
              >
                <div className="relative z-10 max-w-xl space-y-2">
                  <span className="bg-emerald-600 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-lg tracking-wider">Active {profile.displayName} Portal</span>
                  <h2 className="text-xl font-black">Welcome back, {business?.name}</h2>
                  <p className="text-xs text-gray-300 leading-relaxed">Manage your catalog, POS terminals, staff access, and live business operations seamlessly.</p>
                </div>
              </div>

              {/* DATABASE METRICS COUNTERS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-gray-400">{profile.terminology.productsLabel}</span>
                    <div className="text-2xl font-black font-mono text-gray-900 mt-0.5">{stats.productsCount}</div>
                  </div>
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center font-bold">📦</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-gray-400">Active Categories</span>
                    <div className="text-2xl font-black font-mono text-gray-900 mt-0.5">{stats.categoriesCount}</div>
                  </div>
                  <div className="w-10 h-10 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center font-bold">🏷</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-gray-400">Registered Staff</span>
                    <div className="text-2xl font-black font-mono text-gray-900 mt-0.5">{stats.staffCount}</div>
                  </div>
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center font-bold">👥</div>
                </div>

                {effectiveModules.hasTables ? (
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-gray-400">Configured Tables</span>
                      <div className="text-2xl font-black font-mono text-gray-900 mt-0.5">{stats.tablesCount}</div>
                    </div>
                    <div className="w-10 h-10 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center font-bold">🪑</div>
                  </div>
                ) : (
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-gray-400">Operational Mode</span>
                      <div className="text-sm font-black text-emerald-600 mt-1 uppercase tracking-wider">Optimized & Active</div>
                    </div>
                    <div className="w-10 h-10 bg-teal-50 text-teal-700 rounded-xl flex items-center justify-center font-bold">⚡</div>
                  </div>
                )}
              </div>

              {/* CORE COMMAND MODULES */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center space-x-2">
                    <span>⚡ Core Command Modules</span>
                    <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full">Secure Protocol Active</span>
                  </h3>
                  <span className="text-[11px] text-gray-400 font-medium">Real-time operational nodes</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {effectiveModules.hasPOS && (
                    <a href={`/${slug}/pos`} className="bg-gray-900 text-white p-5 rounded-2xl shadow-md hover:bg-black transition group space-y-2.5 border border-yellow-500/40">
                      <div className="flex justify-between items-center">
                        <div className="w-9 h-9 rounded-xl bg-yellow-500 text-black flex items-center justify-center font-bold text-base shadow-inner">🖥</div>
                        <span className="text-[9px] font-mono bg-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded font-bold uppercase">POS Live</span>
                      </div>
                      <h4 className="font-extrabold text-xs tracking-wide group-hover:underline">{profile.terminology.posTitle}</h4>
                      <p className="text-[11px] text-gray-300 leading-relaxed">Launch register & process orders.</p>
                    </a>
                  )}

                  {effectiveModules.hasKDS && (
                    <a href={`/${slug}/kds`} className="bg-gray-900 text-white p-5 rounded-2xl shadow-md hover:bg-black transition group space-y-2.5 border border-red-500/40">
                      <div className="flex justify-between items-center">
                        <div className="w-9 h-9 rounded-xl bg-red-500 text-white flex items-center justify-center font-bold text-base shadow-inner">🍳</div>
                        <span className="text-[9px] font-mono bg-red-400/20 text-red-300 px-2 py-0.5 rounded font-bold uppercase">KDS Routing</span>
                      </div>
                      <h4 className="font-extrabold text-xs tracking-wide group-hover:underline">Kitchen Display (KDS)</h4>
                      <p className="text-[11px] text-gray-300 leading-relaxed">Real-time kitchen order tickets.</p>
                    </a>
                  )}

                  {effectiveModules.hasDispatchQueue && (
                    <a href={`/${slug}/dispatch`} className="bg-gray-900 text-white p-5 rounded-2xl shadow-md hover:bg-black transition group space-y-2.5 border border-blue-400/40">
                      <div className="flex justify-between items-center">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-inner">📦</div>
                        <span className="text-[9px] font-mono bg-blue-400/20 text-blue-300 px-2 py-0.5 rounded font-bold uppercase">Dispatch Live</span>
                      </div>
                      <h4 className="font-extrabold text-xs tracking-wide group-hover:underline">Dispatch & Fulfillment</h4>
                      <p className="text-[11px] text-gray-300 leading-relaxed">Manage delivery queue & rider assignment.</p>
                    </a>
                  )}

                  {effectiveModules.hasStorefront && (
                    <a href={`/${slug}/storefront`} className="bg-gray-900 text-white p-5 rounded-2xl shadow-md hover:bg-black transition group space-y-2.5 border border-purple-500/40">
                      <div className="flex justify-between items-center">
                        <div className="w-9 h-9 rounded-xl bg-purple-500 text-white flex items-center justify-center font-bold text-base shadow-inner">🛍️</div>
                        <span className="text-[9px] font-mono bg-purple-400/20 text-purple-300 px-2 py-0.5 rounded font-bold uppercase">Public Portal</span>
                      </div>
                      <h4 className="font-extrabold text-xs tracking-wide group-hover:underline">Live Storefront</h4>
                      <p className="text-[11px] text-gray-300 leading-relaxed">Customer-facing order portal.</p>
                    </a>
                  )}

                  {effectiveModules.hasERP && (
                    <a href={`/${slug}/finance`} className="bg-gray-900 text-white p-5 rounded-2xl shadow-md hover:bg-black transition group space-y-2.5 border border-blue-500/40">
                      <div className="flex justify-between items-center">
                        <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold text-base shadow-inner">📊</div>
                        <span className="text-[9px] font-mono bg-blue-400/20 text-blue-300 px-2 py-0.5 rounded font-bold uppercase">ERP Telemetry</span>
                      </div>
                      <h4 className="font-extrabold text-xs tracking-wide group-hover:underline">Finance & ERP Reports</h4>
                      <p className="text-[11px] text-gray-300 leading-relaxed">Sales telemetry & ledgers.</p>
                    </a>
                  )}
                </div>
              </div>

              {/* ACTIVE POS SESSIONS & DEVICE LOCK CONTROL (MAIN SCREEN) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center space-x-2">
                    <span>🟢 Active POS Sessions & Device Locks ({activeSessionsList.length})</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full">Live Monitor</span>
                  </h3>
                  <button 
                    type="button" 
                    onClick={() => business?.id && fetchActiveSessions(business.id)}
                    className="px-3 py-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-[10px] font-bold shadow-2xs transition cursor-pointer flex items-center space-x-1"
                  >
                    <span>🔄</span>
                    <span>Refresh Sessions</span>
                  </button>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 text-gray-500 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="p-3">Staff Member & Role</th>
                        <th className="p-3">Department / Code</th>
                        <th className="p-3">Session Active Since</th>
                        <th className="p-3 text-right">Security Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {loadingSessions ? (
                        <tr><td colSpan={4} className="text-center py-8 text-gray-400 font-bold">Querying active terminal sessions...</td></tr>
                      ) : activeSessionsList.length > 0 ? (
                        activeSessionsList.map(sess => {
                          const staffInfo = sess.staff_profiles || {}
                          const staffName = staffInfo.full_name || 'Staff Member'
                          const staffRole = staffInfo.role || 'Cashier'
                          const staffDept = staffInfo.department || 'General'
                          const staffCode = staffInfo.staff_code || 'N/A'
                          const loginTime = sess.last_heartbeat_at ? new Date(sess.last_heartbeat_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'
                          
                          return (
                            <tr key={sess.id} className="hover:bg-gray-50 transition">
                              <td className="p-3">
                                <div className="font-bold text-gray-900">{staffName}</div>
                                <div className="text-[10px] text-indigo-700 font-semibold">{staffRole}</div>
                              </td>
                              <td className="p-3">
                                <div className="font-semibold text-gray-800">{staffDept}</div>
                                <div className="text-[10px] text-gray-400 font-mono">{staffCode}</div>
                              </td>
                              <td className="p-3 font-mono text-[11px] text-gray-600">
                                {loginTime}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleForceLogoutSession(sess.id, staffName)}
                                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-bold shadow-2xs transition cursor-pointer"
                                >
                                  Force Logout 🚫
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="text-center py-10 text-gray-400 font-medium">
                            No active POS sessions currently running. All terminal seats are fully available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* INVENTORY & MANAGEMENT MODULES */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-900">
                    🛠 Inventory & Administrative Management
                  </h3>
                  <span className="text-[11px] text-gray-400 font-medium">Configuration & auditing</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <a href={`/${slug}/products`} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-black transition group space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-base">📦</div>
                      <span className="text-[9px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold uppercase">Catalog</span>
                    </div>
                    <h4 className="font-bold text-xs text-gray-900 group-hover:underline">Product & Inventory Management</h4>
                    <p className="text-[11px] text-gray-500">Categories, items, prices, modifiers, variants & bundles.</p>
                  </a>

                  {/* Staff & QR Security Management Trigger */}
                  <button 
                    onClick={() => { resetStaffForm(); fetchActiveSessions(business.id); setShowStaffDrawer(true); }}
                    className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-black transition group space-y-2 text-left w-full cursor-pointer"
                  >
                    <div className="flex justify-between items-center">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-base">🔑</div>
                      <span className="text-[9px] font-mono bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold uppercase">Security & PINs</span>
                    </div>
                    <h4 className="font-bold text-xs text-gray-900 group-hover:underline">Staff & QR ID Badges</h4>
                    <p className="text-[11px] text-gray-500">Manage staff PINs, QR badges & active session locks.</p>
                  </button>

                  {effectiveModules.hasTables && (
                    <a href={`/${slug}/tables`} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-black transition group space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center font-bold text-base">🪑</div>
                        <span className="text-[9px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold uppercase">Seating</span>
                      </div>
                      <h4 className="font-bold text-xs text-gray-900 group-hover:underline">Dine-In & Zone Management</h4>
                      <p className="text-[11px] text-gray-500">Configure hall zones, tables, and seating capacities.</p>
                    </a>
                  )}

                  <a href={`/${slug}/orders`} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-black transition group space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-base">📋</div>
                      <span className="text-[9px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold uppercase">Audit Log</span>
                    </div>
                    <h4 className="font-bold text-xs text-gray-900 group-hover:underline">{profile.terminology.ordersLabel}</h4>
                    <p className="text-[11px] text-gray-500">Past transaction logs and customer order histories.</p>
                  </a>

                </div>
              </div>
            </>
          ) : (
            /* FULL-SCREEN REPORT VIEWS */
            <div className="space-y-4">
              
              {/* SUB-VIEW 1: SALES REPORT */}
              {activeReportView === 'sales' && (
                <div className="space-y-4">
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
                          filteredSalesReports.map(ord => (
                            <tr key={ord.id} className="hover:bg-gray-50 transition">
                              <td className="p-3">
                                <div className="font-mono font-black text-gray-900">{ord.order_number ? `KB-${String(ord.order_number).padStart(6, '0')}` : 'SAVED'}</div>
                                <div className="text-[10px] text-gray-400 font-mono">{new Date(ord.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                              </td>
                              <td className="p-3">
                                <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded text-[9px] uppercase mr-1">{ord.service_type || 'COUNTER'}</span>
                                <span className="text-[10px] text-emerald-700 font-semibold">{ord.payment_method || 'CASH'}</span>
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
                          ))
                        ) : (
                          <tr><td colSpan={5} className="text-center py-12 text-gray-400">No matching sales records found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB-VIEW: SALES RETURN REPORT */}
              {activeReportView === 'sales_returns' && (
                <div className="space-y-4">
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
                </div>
              )}

              {/* SUB-VIEW 2: CUSTOMER DATABASE */}
              {activeReportView === 'customers' && (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
                    <div className="font-black text-gray-900 uppercase tracking-wide text-[11px] flex justify-between items-center">
                      <span>🔍 Customer Database Filters</span>
                      <button 
                        onClick={() => { setFilterCustName(''); setFilterCustPhone(''); setFilterCustOrigin('ALL'); }}
                        className="text-rose-600 hover:underline font-bold text-[10px] cursor-pointer"
                      >
                        Clear Filters
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Customer Name</label>
                        <input type="text" placeholder="Search name..." value={filterCustName} onChange={e => setFilterCustName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-medium" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Mobile / Phone Number</label>
                        <input type="text" placeholder="Search phone..." value={filterCustPhone} onChange={e => setFilterCustPhone(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-mono" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Registered Through</label>
                        <select value={filterCustOrigin} onChange={e => setFilterCustOrigin(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-bold uppercase">
                          <option value="ALL">ALL CHANNELS</option>
                          <option value="POS">POS TERMINAL</option>
                          <option value="STOREFRONT">STOREFRONT</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-100 text-gray-500 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="p-3">Customer Name & Phone</th>
                          <th className="p-3">Email Address</th>
                          <th className="p-3">Default Address</th>
                          <th className="p-3">Registered Through</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {loadingCustomers ? (
                          <tr><td colSpan={4} className="text-center py-12 text-gray-400 font-bold">Querying customer database...</td></tr>
                        ) : filteredCustomers.length > 0 ? (
                          filteredCustomers.map(cust => (
                            <tr key={cust.id} className="hover:bg-gray-50 transition">
                              <td className="p-3">
                                <div className="font-bold text-gray-900">{cust.name}</div>
                                <div className="text-[10px] text-gray-500 font-mono">{cust.phone}</div>
                              </td>
                              <td className="p-3 text-gray-600 font-mono">{cust.email || 'N/A'}</td>
                              <td className="p-3 text-gray-600">{cust.default_address || 'No Default Address'}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  (cust.origin || 'POS') === 'STOREFRONT' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {cust.origin || 'POS'}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={4} className="text-center py-12 text-gray-400">No customers registered in database yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB-VIEW 3: STAFF DATABASE */}
              {activeReportView === 'staff' && (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
                    <div className="font-black text-gray-900 uppercase tracking-wide text-[11px] flex justify-between items-center">
                      <span>🔍 Staff Database Filters</span>
                      <button 
                        onClick={() => { setStaffFilterId(''); setStaffFilterName(''); setStaffFilterRole('ALL'); setStaffFilterDept('ALL'); }}
                        className="text-rose-600 hover:underline font-bold text-[10px] cursor-pointer"
                      >
                        Clear Filters
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Staff ID / Code</label>
                        <input type="text" placeholder="STF-..." value={staffFilterId} onChange={e => setStaffFilterId(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-mono uppercase" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Staff Name</label>
                        <input type="text" placeholder="Search name..." value={staffFilterName} onChange={e => setStaffFilterName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-medium" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Role / Title</label>
                        <select value={staffFilterRole} onChange={e => setStaffFilterRole(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-bold uppercase">
                          <option value="ALL">ALL ROLES</option>
                          {roles.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Department</label>
                        <select value={staffFilterDept} onChange={e => setStaffFilterDept(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-bold uppercase">
                          <option value="ALL">ALL DEPARTMENTS</option>
                          {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-100 text-gray-500 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="p-3">Staff ID / Name</th>
                          <th className="p-3">Role & Title</th>
                          <th className="p-3">Department</th>
                          <th className="p-3">Security PIN</th>
                          <th className="p-3">QR Badge Token</th>
                          <th className="p-3 text-right">Badge Link</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredStaffDatabase.length > 0 ? (
                          filteredStaffDatabase.map(st => (
                            <tr key={st.id} className="hover:bg-gray-50 transition">
                              <td className="p-3">
                                <div className="font-bold text-gray-900">{st.full_name}</div>
                                <div className="text-[10px] text-gray-400 font-mono">{st.staff_code || 'N/A'}</div>
                              </td>
                              <td className="p-3 font-bold text-indigo-700">{st.role}</td>
                              <td className="p-3 text-gray-600 font-semibold">{st.department || 'General'}</td>
                              <td className="p-3 font-mono font-bold text-gray-800">{st.pin_code}</td>
                              <td className="p-3 font-mono text-[10px] text-slate-700 select-all font-bold">{st.qr_token || 'N/A'}</td>
                              <td className="p-3 text-right">
                                <button 
                                  onClick={() => setBadgePreviewStaff(st)}
                                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold shadow-2xs transition cursor-pointer"
                                >
                                  View Badge 🪪
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={6} className="text-center py-12 text-gray-400">No staff members match the selected filters.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

        </main>
      </div>

      {/* STAFF & QR SECURITY MANAGEMENT SLIDE-OVER DRAWER */}
      {showStaffDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans">
          <div onClick={() => setShowStaffDrawer(false)} className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity" />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen md:w-[35vw] bg-white border-l border-gray-200 shadow-2xl flex flex-col text-gray-800">
              
              <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">🔑</span>
                  <div>
                    <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-900">Staff & QR Security Manager</h2>
                    <p className="text-[11px] text-gray-500">Manage staff profiles, PINs & module access</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowStaffDrawer(false)}
                  className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center font-bold transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                <form onSubmit={handleSaveStaff} className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-4 text-xs">
                  <div className="flex justify-between items-center">
                    <h3 className="font-black text-gray-900 uppercase tracking-wide text-emerald-700">
                      {editingStaffId ? '✏️ Edit Staff Profile' : '+ Register New Staff Member'}
                    </h3>
                    {editingStaffId && (
                      <button 
                        type="button" 
                        onClick={resetStaffForm}
                        className="text-[11px] text-gray-500 hover:text-black font-bold underline cursor-pointer"
                      >
                        Cancel Editing
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">Staff Full Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. John Doe"
                        value={newStaffName}
                        onChange={e => setNewStaffName(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:outline-none focus:border-emerald-500 font-medium"
                        required 
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-700 font-bold mb-1">Staff ID / Code</label>
                        <div className="flex space-x-1">
                          <input 
                            type="text" 
                            placeholder="STF-001"
                            value={newStaffCode}
                            onChange={e => setNewStaffCode(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-xl px-2.5 py-2 text-gray-900 font-mono text-xs uppercase"
                          />
                          <button 
                            type="button" 
                            onClick={() => setNewStaffCode(generateDefaultStaffCode())}
                            className="px-2.5 bg-gray-200 hover:bg-gray-300 rounded-xl text-[10px] font-bold text-gray-700 shrink-0 cursor-pointer"
                            title="Auto-generate ID"
                          >
                            Auto
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-gray-700 font-bold mb-1">Department / Section</label>
                        <div className="space-y-1.5">
                          <div className="flex space-x-1">
                            <select
                              value={newStaffDept}
                              onChange={e => setNewStaffDept(e.target.value)}
                              className="w-full bg-white border border-gray-300 rounded-xl px-2.5 py-2 text-gray-900 font-medium text-xs"
                            >
                              {departments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                              ))}
                            </select>
                            {departments.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveDepartment(newStaffDept)}
                                className="px-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-[10px] font-bold cursor-pointer"
                                title="Remove selected department"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          <div className="flex space-x-1">
                            <input
                              type="text"
                              placeholder="New department..."
                              value={newDeptInput}
                              onChange={e => setNewDeptInput(e.target.value)}
                              className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-[11px]"
                            />
                            <button
                              type="button"
                              onClick={handleAddDepartment}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold shrink-0 cursor-pointer"
                            >
                              + Add
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1">Role / Title</label>
                      <div className="space-y-1.5">
                        <div className="flex space-x-1">
                          <select
                            value={newStaffRole}
                            onChange={e => setNewStaffRole(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-900 font-medium"
                          >
                            {roles.map(role => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                          {roles.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRole(newStaffRole)}
                              className="px-2.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-[10px] font-bold cursor-pointer"
                              title="Remove selected role"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <div className="flex space-x-1">
                          <input
                            type="text"
                            placeholder="New role / title..."
                            value={newRoleInput}
                            onChange={e => setNewRoleInput(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-[11px]"
                          />
                          <button
                            type="button"
                            onClick={handleAddRole}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold shrink-0 cursor-pointer"
                          >
                            + Add Role
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-700 font-bold mb-1">Security PIN (4-6 Digits)</label>
                        <input 
                          type="text" 
                          maxLength={6}
                          placeholder="1234"
                          value={newStaffPin}
                          onChange={e => setNewStaffPin(e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-900 font-mono tracking-widest focus:outline-none focus:border-emerald-500 font-bold"
                          required 
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-bold mb-1">Custom QR Token (Optional)</label>
                        <input 
                          type="text" 
                          placeholder="STAFF-..."
                          value={newStaffCustomToken}
                          onChange={e => setNewStaffCustomToken(e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-900 font-mono text-[10px]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <span className="font-bold text-gray-700 block">Granular Module Permissions:</span>
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {effectiveModules.hasPOS && (
                        <label className="flex items-center space-x-2 bg-white p-2.5 rounded-xl border border-gray-200 cursor-pointer">
                          <input type="checkbox" checked={staffPos} onChange={e => setStaffPos(e.target.checked)} className="rounded text-emerald-600 focus:ring-0" />
                          <span className="font-semibold text-gray-800">POS Terminal</span>
                        </label>
                      )}
                      {effectiveModules.hasKDS && (
                        <label className="flex items-center space-x-2 bg-white p-2.5 rounded-xl border border-gray-200 cursor-pointer">
                          <input type="checkbox" checked={staffKds} onChange={e => setStaffKds(e.target.checked)} className="rounded text-emerald-600 focus:ring-0" />
                          <span className="font-semibold text-gray-800">Kitchen KDS</span>
                        </label>
                      )}
                      {effectiveModules.hasERP && (
                        <label className="flex items-center space-x-2 bg-white p-2.5 rounded-xl border border-gray-200 cursor-pointer">
                          <input type="checkbox" checked={staffErp} onChange={e => setStaffErp(e.target.checked)} className="rounded text-emerald-600 focus:ring-0" />
                          <span className="font-semibold text-gray-800">ERP & Finance</span>
                        </label>
                      )}
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={savingStaff}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-sm text-xs uppercase tracking-wider cursor-pointer"
                  >
                    {savingStaff ? 'Saving Staff Profile...' : editingStaffId ? 'Update Staff Profile 💾' : 'Save Staff & Issue QR ID Badge 🆔'}
                  </button>
                </form>

                <div className="space-y-3">
                  <h3 className="font-black text-gray-900 uppercase tracking-wider text-xs">Registered Staff Directory ({staffList.length})</h3>
                    
                  <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-100 text-gray-500 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="p-3">Staff ID / Name / Dept</th>
                          <th className="p-3">PIN</th>
                          <th className="p-3">QR Badge Token</th>
                          <th className="p-3">Permissions</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {staffList.length > 0 ? staffList.map(st => (
                          <tr key={st.id} className="hover:bg-gray-50/80 transition">
                            <td className="p-3">
                              <div className="font-bold text-gray-900">{st.full_name}</div>
                              <div className="text-[10px] text-gray-500 font-mono">{st.staff_code || 'N/A'} • {st.department || 'General'}</div>
                              <div className="text-[9px] text-gray-400 uppercase font-semibold">{st.role}</div>
                            </td>
                            <td className="p-3 font-mono font-bold text-gray-700">
                              {st.pin_code}
                            </td>
                            <td className="p-3 font-mono text-[10px] text-indigo-700 select-all font-bold">
                              {st.qr_token || 'N/A'}
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {st.access_pos && <span className="bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded text-[9px] font-bold">POS</span>}
                                {st.access_kds && <span className="bg-red-100 text-red-800 px-1 py-0.5 rounded text-[9px] font-bold">KDS</span>}
                                {st.access_erp && <span className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-[9px] font-bold">ERP</span>}
                              </div>
                            </td>
                            <td className="p-3 text-right space-x-1">
                              <button 
                                onClick={() => setBadgePreviewStaff(st)}
                                className="text-emerald-600 hover:text-emerald-800 font-bold text-xs px-2 py-1 rounded hover:bg-emerald-50 transition cursor-pointer"
                              >
                                Badge
                              </button>
                              <button 
                                onClick={() => handleEditStaffClick(st)}
                                className="text-indigo-600 hover:text-indigo-800 font-bold text-xs px-2 py-1 rounded hover:bg-indigo-50 transition cursor-pointer"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteStaff(st.id)}
                                className="text-red-500 hover:text-red-700 font-bold text-xs px-2 py-1 rounded hover:bg-red-50 transition cursor-pointer"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-gray-400">No staff members registered yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR BADGE PREVIEW MODAL */}
      {badgePreviewStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-gray-200 text-gray-800">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-xl font-bold">
              🪪
            </div>
            <div>
              <h3 className="font-extrabold text-sm uppercase text-gray-900">{badgePreviewStaff.full_name}</h3>
              <p className="text-xs text-gray-500 font-medium">
                {badgePreviewStaff.role} • Dept: {badgePreviewStaff.department || 'General'} • PIN: {badgePreviewStaff.pin_code}
              </p>
            </div>
              
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col items-center justify-center">
              <div id="staff-qr-badge-svg">
                <QRCodeSVG value={badgePreviewStaff.qr_token || 'N/A'} size={144} level="H" includeMargin={true} />
              </div>
              <span className="mt-3 font-mono text-[11px] text-indigo-700 font-bold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 select-all">
                {badgePreviewStaff.qr_token || 'N/A'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button 
                type="button"
                onClick={downloadQrBadgePng}
                className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-500 transition cursor-pointer"
              >
                ⬇️ Download PNG Badge
              </button>
              <button 
                type="button"
                onClick={() => setBadgePreviewStaff(null)}
                className="w-full py-2.5 bg-gray-900 text-white font-bold rounded-xl text-xs hover:bg-black transition cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BUSINESS SETTINGS DRAWER */}
      {showSettingsDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans">
          <div onClick={() => setShowSettingsDrawer(false)} className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity" />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white border-l border-gray-200 shadow-2xl flex flex-col text-gray-800">
                
              <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">⚙️</span>
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-900">Business Settings</h2>
                </div>
                <button 
                  onClick={() => setShowSettingsDrawer(false)}
                  className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center font-bold transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <form onSubmit={handleSaveSettings} id="business-settings-form" className="space-y-4 text-xs">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Business Name</label>
                    <input 
                      type="text" 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)} 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 focus:outline-none focus:border-emerald-500 font-medium"
                      required 
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Business Type / Category</label>
                    <select 
                      value={editType} 
                      onChange={e => setEditType(e.target.value)} 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 uppercase focus:outline-none focus:border-emerald-500 font-medium"
                    >
                      <option value="restaurant">Restaurant</option>
                      <option value="retail">Retail Store</option>
                      <option value="perfumery">Perfumery</option>
                      <option value="Building Materials">Building Materials</option>
                      <option value="Pharmacy">Pharmacy</option>
                    </select>
                  </div>

                  {/* Sequence Starting Points Configuration */}
                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    <label className="block text-gray-700 font-bold uppercase tracking-wider text-[11px]">Sequence Starting Points</label>
                    <p className="text-[10px] text-gray-500">Configure exact starting numbers for your invoice numbering continuity.</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Set Order No.</label>
                        <input 
                          type="number"
                          value={editNextOrderSeq}
                          onChange={e => setEditNextOrderSeq(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 font-mono text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Set Serial No.</label>
                        <input 
                          type="number"
                          value={editNextSerialSeq}
                          onChange={e => setEditNextSerialSeq(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 font-mono text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Set KOT No.</label>
                        <input 
                          type="number"
                          value={editNextKotSeq}
                          onChange={e => setEditNextKotSeq(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 font-mono text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Set SRR No.</label>
                        <input 
                          type="number"
                          value={editNextSrrSeq}
                          onChange={e => setEditNextSrrSeq(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 font-mono text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tenant Granular Module Access */}
                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    <label className="block text-gray-700 font-bold">Tenant Granular Module Access</label>
                    <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={editHasPos} onChange={e => setEditHasPos(e.target.checked)} className="rounded text-emerald-600 focus:ring-0" />
                        <span className="font-semibold text-gray-800">POS Terminal</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={editHasKds} onChange={e => setEditHasKds(e.target.checked)} className="rounded text-emerald-600 focus:ring-0" />
                        <span className="font-semibold text-gray-800">Kitchen KDS</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={editHasDispatchQueue} onChange={e => setEditHasDispatchQueue(e.target.checked)} className="rounded text-emerald-600 focus:ring-0" />
                        <span className="font-semibold text-gray-800">Dispatch Queue</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={editHasErp} onChange={e => setEditHasErp(e.target.checked)} className="rounded text-emerald-600 focus:ring-0" />
                        <span className="font-semibold text-gray-800">ERP & Finance</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={editHasTables} onChange={e => setEditHasTables(e.target.checked)} className="rounded text-emerald-600 focus:ring-0" />
                        <span className="font-semibold text-gray-800">Dine-In Tables</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    <label className="block text-gray-700 font-bold">Business Logo</label>
                    <div className="flex items-center space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                      <div className="w-12 h-12 bg-white rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 p-1">
                        {editLogoUrl ? (
                          <img src={editLogoUrl} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <span>🏢</span>
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleLogoUpload}
                          className="w-full text-[10px] text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                        />
                        {uploadingLogo && <span className="text-[10px] text-amber-600 animate-pulse mt-1 block font-bold">Uploading logo...</span>}
                      </div>
                    </div>
                    <div>
                      <input 
                        type="text" 
                        value={editLogoUrl} 
                        onChange={e => setEditLogoUrl(e.target.value)} 
                        placeholder="Or enter public image URL path..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-mono text-[11px]" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    <label className="block text-gray-700 font-bold">Custom Welcome Banner</label>
                    <div className="flex items-center space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                      <div className="w-16 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                        {editBannerUrl ? (
                          <img src={editBannerUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs">🖼️</span>
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleBannerUpload}
                          className="w-full text-[10px] text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                        />
                        {uploadingBanner && <span className="text-[10px] text-amber-600 animate-pulse mt-1 block font-bold">Uploading banner...</span>}
                      </div>
                    </div>
                    <div>
                      <input 
                        type="text" 
                        value={editBannerUrl} 
                        onChange={e => setEditBannerUrl(e.target.value)} 
                        placeholder="Or enter banner image URL..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-mono text-[11px]" 
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-200">
                    <label className="block text-gray-700 font-bold mb-1">Contact / WhatsApp Number</label>
                    <input 
                      type="text" 
                      value={editPhone} 
                      onChange={e => setEditPhone(e.target.value)} 
                      placeholder="+92 300 0000000"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Business E-Mail</label>
                    <input 
                      type="email" 
                      value={editEmail} 
                      onChange={e => setEditEmail(e.target.value)} 
                      placeholder="store@domain.com"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Business Website URL</label>
                    <input 
                      type="text" 
                      value={editWebUrl} 
                      onChange={e => setEditWebUrl(e.target.value)} 
                      placeholder="https://yourdomain.com"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Business Address</label>
                    <textarea 
                      rows={2}
                      value={editAddress} 
                      onChange={e => setEditAddress(e.target.value)} 
                      placeholder="Street, Area, City"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-gray-200 bg-gray-50 space-y-3">
                <button 
                  type="submit" 
                  form="business-settings-form"
                  disabled={savingSettings || uploadingLogo || uploadingBanner}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-sm text-xs cursor-pointer"
                >
                  {savingSettings ? 'Saving Changes...' : 'Save Credentials 💾'}
                </button>

                <button 
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold transition text-xs flex items-center justify-center space-x-2 shadow-2xs cursor-pointer"
                >
                  <span>🚪</span>
                  <span>Sign Out of Store</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}