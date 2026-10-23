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

  // Dashboard Analytics & Charts States
  const [dashboardOrders, setDashboardOrders] = useState<any[]>([])
  const [salesDaysFilter, setSalesDaysFilter] = useState<number>(15)
  const [topRankingMode, setTopRankingMode] = useState<'revenue' | 'units'>('revenue')
  const [hoveredSalesDay, setHoveredSalesDay] = useState<any | null>(null)

  // Settings Drawer State
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)

  // Reports & Database Full-Screen View State & Collapsible Menu State
  const [activeReportView, setActiveReportView] = useState<'sales' | 'sales_returns' | 'cash_liquidity' | 'customers' | 'staff' | null>(null)
  const [isReportsMenuOpen, setIsReportsMenuOpen] = useState(false)
  
  // Cash Liquidity Report & Batch Settlement States
  const [cashLiquidityData, setCashLiquidityData] = useState<any[]>([])
  const [loadingLiquidity, setLoadingLiquidity] = useState(false)
  const [showSettlementModal, setShowSettlementModal] = useState(false)
  const [selectedStaffForSettlement, setSelectedStaffForSettlement] = useState('')
  const [waiterSearch, setWaiterSearch] = useState('')
  const [riderSearch, setRiderSearch] = useState('')
  const [pendingOrdersForStaff, setPendingOrdersForStaff] = useState<any[]>([])
  const [settlementInputs, setSettlementInputs] = useState<{ [orderId: string]: { received: string; discount: string; notes: string } }>({})
  const [processingSettlement, setProcessingSettlement] = useState(false)

  // ESC key listener to close settlement drawer instantly (unless focused on search inputs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showSettlementModal) {
        const activeEl = document.activeElement
        const isSearchInput = activeEl?.tagName === 'INPUT' && (
          (activeEl as HTMLInputElement).placeholder?.toLowerCase().includes('search')
        )
        if (!isSearchInput) {
          setShowSettlementModal(false)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showSettlementModal])

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

  // Staff Management Drawer State
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

  // Active POS Sessions Management State
  const [activeSessionsList, setActiveSessionsList] = useState<any[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)

  // Extended Staff Profile Fields & Dynamic Management States
  const [newStaffCode, setNewStaffCode] = useState('')
  const [newStaffDept, setNewStaffDept] = useState('General')
  const [newStaffCustomToken, setNewStaffCustomToken] = useState('')

  const [departments, setDepartments] = useState<string[]>(['General', 'Kitchen', 'Service', 'Management'])
  const [newDeptInput, setNewDeptInput] = useState('')
  const [roles, setRoles] = useState<string[]>(['Cashier', 'Chef / Kitchen', 'Store Manager', 'Admin', 'Waiter', 'Delivery Rider'])
  const [newRoleInput, setNewRoleInput] = useState('')

  const generateDefaultStaffCode = () => {
    const randNum = Math.floor(100 + Math.random() * 900)
    return `STF-${slug.slice(0, 4).toUpperCase()}-${randNum}`
  }

  // Editable Business Settings Fields (Business Name & Type excluded from tenant editing)
  const [editLogoUrl, setEditLogoUrl] = useState('')
  const [editBannerUrl, setEditBannerUrl] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editWebUrl, setEditWebUrl] = useState('')

  // Sequence Starting Points & Prefixes Configuration State
  const [editNextOrderSeq, setEditNextOrderSeq] = useState<string>('100000')
  const [editOrderPrefix, setEditOrderPrefix] = useState<string>('')

  const [editNextSerialSeq, setEditNextSerialSeq] = useState<string>('100000')
  const [editSerialPrefix, setEditSerialPrefix] = useState<string>('')

  const [editNextKotSeq, setEditNextKotSeq] = useState<string>('100000')
  const [editKotPrefix, setEditKotPrefix] = useState<string>('')

  const [editNextSrrSeq, setEditNextSrrSeq] = useState<string>('100000')
  const [editSrrPrefix, setEditSrrPrefix] = useState<string>('')

  const [editNextQuotationSeq, setEditNextQuotationSeq] = useState<string>('100000')
  const [editQuotationPrefix, setEditQuotationPrefix] = useState<string>('')

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
      setEditLogoUrl(biz.logo_url || '')
      setEditBannerUrl(biz.banner_url || '')
      setEditAddress(biz.address || '')
      setEditPhone(biz.phone || '')
      setEditEmail(biz.email || '')
      setEditWebUrl(biz.web_url || '')

      setEditNextOrderSeq(String(biz.next_order_seq ?? 100000))
      setEditOrderPrefix(biz.order_prefix || '')

      setEditNextSerialSeq(String(biz.next_serial_seq ?? 100000))
      setEditSerialPrefix(biz.serial_prefix || '')

      setEditNextKotSeq(String(biz.next_kot_seq ?? 100000))
      setEditKotPrefix(biz.kot_prefix || '')

      setEditNextSrrSeq(String(biz.next_srr_seq ?? 100000))
      setEditSrrPrefix(biz.srr_prefix || '')

      setEditNextQuotationSeq(String(biz.next_quotation_seq ?? 100000))
      setEditQuotationPrefix(biz.quotation_prefix || '')

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

      const [{ count: pCount }, { count: cCount }, { count: tCount }, { count: sCount, data: sData }, { data: ordData }] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('business_id', biz.id),
        supabase.from('categories').select('*', { count: 'exact', head: true }).eq('business_id', biz.id),
        supabase.from('tables').select('*', { count: 'exact', head: true }).eq('business_id', biz.id),
        supabase.from('staff_profiles').select('*', { count: 'exact' }).eq('business_id', biz.id),
        supabase.from('orders').select('*').eq('business_id', biz.id).order('created_at', { ascending: false })
      ])

      setStats({
        productsCount: pCount || 0,
        categoriesCount: cCount || 0,
        tablesCount: tCount || 0,
        staffCount: sCount || 0
      })

      if (sData) setStaffList(sData)
      if (ordData) setDashboardOrders(ordData)

      fetchActiveSessions(biz.id)
      setLoading(false)
    }

    fetchTenantData()
  }, [slug, router])

  // Computed Sales Trend Data for Last X Days
  const salesTrendData = useMemo(() => {
    const daysMap: { [dateStr: string]: number } = {}
    const today = new Date()
    
    for (let i = salesDaysFilter - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(today.getDate() - i)
      const dateString = d.toISOString().split('T')[0]
      daysMap[dateString] = 0
    }

    dashboardOrders.forEach(ord => {
      const ordDate = new Date(ord.created_at).toISOString().split('T')[0]
      if (daysMap[ordDate] !== undefined) {
        daysMap[ordDate] += parseFloat(ord.total_amount) || 0
      }
    })

    return Object.keys(daysMap).map(dateStr => ({
      date: dateStr,
      formattedDate: new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      totalSale: daysMap[dateStr]
    }))
  }, [dashboardOrders, salesDaysFilter])

  // Computed Top 10 Selling Items (Last 30 Days) with Sort Mode (Revenue or Units)
  const topSellingItemsData = useMemo(() => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const itemCounts: { [name: string]: { qty: number; revenue: number } } = {}

    dashboardOrders.forEach(ord => {
      const ordDate = new Date(ord.created_at)
      if (ordDate >= thirtyDaysAgo && ord.items && Array.isArray(ord.items)) {
        ord.items.forEach((it: any) => {
          const itemName = it.name || it.title || 'Unknown Item'
          const qty = parseFloat(it.quantity || it.qty || 1)
          const price = parseFloat(it.price || it.unit_price || 0)
          
          if (!itemCounts[itemName]) {
            itemCounts[itemName] = { qty: 0, revenue: 0 }
          }
          itemCounts[itemName].qty += qty
          itemCounts[itemName].revenue += qty * price
        })
      }
    })

    const unsorted = Object.keys(itemCounts).map(name => ({
      name,
      qty: itemCounts[name].qty,
      revenue: itemCounts[name].revenue
    }))

    if (topRankingMode === 'units') {
      return unsorted.sort((a, b) => b.qty - a.qty).slice(0, 10)
    } else {
      return unsorted.sort((a, b) => b.revenue - a.revenue).slice(0, 10)
    }
  }, [dashboardOrders, topRankingMode])

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

  // Fetch Cash Liquidity Transactions
  const fetchCashLiquidityReport = async () => {
    if (!business?.id) return
    setLoadingLiquidity(true)
    const { data, error } = await supabase
      .from('cash_liquidity_transactions')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setCashLiquidityData(data)
    }
    setLoadingLiquidity(false)
  }

  // Fetch Pending Orders for a Specific Staff Member or 3rd Party Rider
  const fetchPendingOrdersForStaff = async (staffIdentifier: string) => {
    if (!business?.id || !staffIdentifier) return

    let resolvedName = staffIdentifier
    if (staffIdentifier.startsWith('3rd-')) {
      resolvedName = staffIdentifier.replace('3rd-', '').trim()
    } else {
      const matchedStaffObj = staffList.find(st => st.id === staffIdentifier || st.full_name?.toLowerCase() === staffIdentifier.trim().toLowerCase())
      if (matchedStaffObj) {
        resolvedName = matchedStaffObj.full_name || matchedStaffObj.name
      }
    }

    const cleanTargetName = resolvedName.toLowerCase().trim()

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('business_id', business.id)
      .neq('settlement_status', 'SETTLED')
      .order('created_at', { ascending: false })

    if (!error && data) {
      const pendingForThisStaff = data.filter(ord => {
        const isSettled = (ord.settlement_status || '').toUpperCase() === 'SETTLED'
        if (isSettled) return false

        const matchById = ord.waiter_id === staffIdentifier || ord.rider_id === staffIdentifier
        const orderWaiter = (ord.waiter_name || '').toLowerCase().trim()
        const orderRider = (ord.rider_name || ord.rider || '').toLowerCase().trim()

        const matchByName = (orderWaiter && orderWaiter === cleanTargetName) || 
                          (orderRider && orderRider === cleanTargetName) ||
                          (orderRider && orderRider.includes(cleanTargetName))

        return (matchById || matchByName)
      })

      setPendingOrdersForStaff(pendingForThisStaff)
      const initialMap: any = {}
      pendingForThisStaff.forEach(ord => {
        initialMap[ord.id] = {
          received: String(ord.total_amount || 0),
          discount: '0',
          notes: ''
        }
      })
      setSettlementInputs(initialMap)
    } else {
      console.error('Error fetching orders for staff settlement:', error?.message)
    }
  }

  // Submit Batch Settlement
  const handleProcessBatchSettlement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStaffForSettlement || pendingOrdersForStaff.length === 0) {
      alert('Please select a staff member and at least one pending order.')
      return
    }

    setProcessingSettlement(true)
    try {
      const isThirdParty = selectedStaffForSettlement.startsWith('3rd-')
      let staffIdToSave = null
      let staffNameVal = selectedStaffForSettlement

      if (isThirdParty) {
        staffNameVal = selectedStaffForSettlement.replace('3rd-', '')
      } else {
        const matchedStaffObj = staffList.find(st => st.id === selectedStaffForSettlement || st.full_name === selectedStaffForSettlement)
        staffIdToSave = matchedStaffObj ? matchedStaffObj.id : null
        staffNameVal = matchedStaffObj ? (matchedStaffObj.full_name || matchedStaffObj.name) : selectedStaffForSettlement
      }

      for (const ord of pendingOrdersForStaff) {
        const input = settlementInputs[ord.id]
        if (!input) continue

        if (ord.settlement_status === 'SETTLED') continue

        const billed = parseFloat(ord.total_amount) || 0
        const received = parseFloat(input.received) || 0
        const discount = parseFloat(input.discount) || 0

        await supabase.from('cash_liquidity_transactions').insert([{
          business_id: business.id,
          invoice_id: ord.id,
          staff_id: staffIdToSave,
          staff_name: staffNameVal,
          billed_amount: billed,
          amount_received: received,
          discount_amount: discount,
          payment_method: 'CASH',
          notes: input.notes || 'Batch cash drop settlement'
        }])

        await supabase.from('orders').update({
          settlement_status: 'SETTLED',
          settled_at: new Date().toISOString(),
          settlement_shortage: discount
        }).eq('id', ord.id)
      }

      alert('Batch cash drop settled successfully! Ledgers updated.')
      setShowSettlementModal(false)
      fetchSalesReport()
      if (activeReportView === 'cash_liquidity') fetchCashLiquidityReport()
    } catch (err: any) {
      alert(`Settlement failed: ${err.message}`)
    }
    setProcessingSettlement(false)
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
  const selectReportView = (type: 'sales' | 'sales_returns' | 'cash_liquidity' | 'customers' | 'staff' | null) => {
    setActiveReportView(type)
    if (type === 'sales') fetchSalesReport()
    if (type === 'sales_returns') fetchSalesReturnsReport()
    if (type === 'cash_liquidity') fetchCashLiquidityReport()
    if (type === 'customers') fetchCustomerDatabase()
  }

  // Filter staff lists strictly for Waiters
  const waitersList = staffList.filter(st => {
    const r = (st.role || '').toLowerCase()
    const d = (st.department || '').toLowerCase()
    const isWaiter = r.includes('waiter') || d.includes('service') || r.includes('server') || d.includes('waitstaff')
    return isWaiter
  }).filter(st => {
    if (!waiterSearch.trim()) return true
    return (st.full_name || st.name || '').toLowerCase().includes(waiterSearch.toLowerCase().trim())
  })

  // Filtered riders list combining In-House Riders and dynamically extracted 3rd Party Partners
  const ridersList = useMemo(() => {
    const inHouseRiders = staffList.filter(st => {
      const r = (st.role || '').toLowerCase()
      const d = (st.department || '').toLowerCase()
      return r.includes('rider') || r.includes('delivery') || d.includes('delivery') || d.includes('logistic') || r.includes('driver')
    })

    const thirdPartyNames = new Set<string>()
    salesReportData.forEach(ord => {
      if ((ord.service_type || '').toUpperCase() === 'DELIVERY' && !ord.rider_id && ord.rider_name) {
        thirdPartyNames.add(ord.rider_name.trim())
      }
    })

    const thirdPartyAsStaff = Array.from(thirdPartyNames).map(name => ({
      id: `3rd-${name}`,
      full_name: name,
      role: '3rd Party Partner'
    }))

    const combined = [...inHouseRiders, ...thirdPartyAsStaff]
    if (!riderSearch.trim()) return combined
    return combined.filter(st => (st.full_name || st.name || '').toLowerCase().includes(riderSearch.toLowerCase().trim()))
  }, [staffList, salesReportData, riderSearch])

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
          setEditOrderPrefix(updatedBiz.order_prefix || '')

          setEditNextSerialSeq(String(updatedBiz.next_serial_seq ?? 100000))
          setEditSerialPrefix(updatedBiz.serial_prefix || '')

          setEditNextKotSeq(String(updatedBiz.next_kot_seq ?? 100000))
          setEditKotPrefix(updatedBiz.kot_prefix || '')

          setEditNextSrrSeq(String(updatedBiz.next_srr_seq ?? 100000))
          setEditSrrPrefix(updatedBiz.srr_prefix || '')

          setEditNextQuotationSeq(String(updatedBiz.next_quotation_seq ?? 100000))
          setEditQuotationPrefix(updatedBiz.quotation_prefix || '')
          
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
    const parsedQuotationSeq = parseInt(editNextQuotationSeq) || 100000

    setSavingSettings(true)
    const { error } = await supabase
      .from('businesses')
      .update({
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
        order_prefix: editOrderPrefix.trim().slice(0, 5),
        next_serial_seq: parsedSerialSeq,
        serial_prefix: editSerialPrefix.trim().slice(0, 5),
        next_kot_seq: parsedKotSeq,
        kot_prefix: editKotPrefix.trim().slice(0, 5),
        next_srr_seq: parsedSrrSeq,
        srr_prefix: editSrrPrefix.trim().slice(0, 5),
        next_quotation_seq: parsedQuotationSeq,
        quotation_prefix: editQuotationPrefix.trim().slice(0, 5)
      })
      .eq('id', business.id)

    if (error) {
      alert(`Failed to update business settings: ${error.message}`)
    } else {
      alert('Business credentials & sequence starting points updated successfully!')
      setBusiness({
        ...business,
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
        order_prefix: editOrderPrefix.trim().slice(0, 5),
        next_serial_seq: parsedSerialSeq,
        serial_prefix: editSerialPrefix.trim().slice(0, 5),
        next_kot_seq: parsedKotSeq,
        kot_prefix: editKotPrefix.trim().slice(0, 5),
        next_srr_seq: parsedSrrSeq,
        srr_prefix: editSrrPrefix.trim().slice(0, 5),
        next_quotation_seq: parsedQuotationSeq,
        quotation_prefix: editQuotationPrefix.trim().slice(0, 5)
      })
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-bold text-blue-600 space-y-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs uppercase tracking-widest text-blue-600 font-black">Loading {slug} Ecosystem...</p>
      </div>
    )
  }

  if (business?.subscription_status === 'suspended') {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-800 flex items-center justify-center p-4 font-sans">
        <div className="bg-white border border-red-200 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-inner">
            🚫
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-black uppercase tracking-wider text-red-600">Account Suspended</h1>
            <p className="text-xs text-slate-500">
              The store <span className="font-bold text-slate-800">{business?.name}</span> has been temporarily suspended by the Master Administrator.
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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-row h-screen overflow-hidden font-sans select-none text-xs antialiased">
      
      {/* HOVER-EXPANDABLE COLLAPSIBLE MEGA MENU SIDEBAR (SHRINK STRIP -> EXPAND ON HOVER) */}
      <aside className="w-20 hover:w-68 bg-white text-slate-700 border-r border-slate-200 flex flex-col shrink-0 justify-between shadow-md z-20 overflow-y-auto transition-all duration-300 ease-in-out group overflow-x-hidden">
        <div className="p-4 space-y-6">
          {/* Brand header */}
          <div className="flex items-center space-x-3.5 pb-4 border-b border-slate-100 whitespace-nowrap">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-md shadow-blue-500/20 overflow-hidden shrink-0 border border-blue-400/30">
              {business?.logo_url ? (
                <img src={business.logo_url} alt={business.name} className="w-full h-full object-contain bg-white p-1" />
              ) : (
                <span>🏢</span>
              )}
            </div>
            <div className="overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <h1 className="text-xs font-black uppercase tracking-wider text-slate-900 truncate">{business?.name || 'Dashboard'}</h1>
              <span className={`inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-2xs bg-blue-50 text-blue-700 border border-blue-200`}>
                {profile.displayName}
              </span>
            </div>
          </div>

          {/* Navigation Items with Line-Art Vector Icons */}
          <nav className="space-y-1.5">
            <a 
              href={`/${slug}`} 
              onClick={() => selectReportView(null)}
              className={`flex items-center space-x-3.5 px-3 py-3 rounded-2xl font-bold text-xs transition-all duration-200 whitespace-nowrap ${
                activeReportView === null 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 border border-blue-500/30' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <svg className="w-5 h-5 shrink-0 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 tracking-wide">HOME CONTROL</span>
            </a>

            {effectiveModules.hasPOS && (
              <a 
                href={`/${slug}/pos`} 
                className="flex items-center space-x-3.5 px-3 py-3 rounded-2xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-semibold text-xs transition-all duration-200 whitespace-nowrap"
              >
                <svg className="w-5 h-5 shrink-0 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24"><rect width="20" height="14" x="2" y="3" rx="2" /><line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" /></svg>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 tracking-wide">POS Controls</span>
              </a>
            )}

            {effectiveModules.hasKDS && (
              <a 
                href={`/${slug}/kds`} 
                className="flex items-center space-x-3.5 px-3 py-3 rounded-2xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-semibold text-xs transition-all duration-200 whitespace-nowrap"
              >
                <svg className="w-5 h-5 shrink-0 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" x2="14" y1="12" y2="12" /></svg>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 tracking-wide">KDS Controls</span>
              </a>
            )}

            {effectiveModules.hasDispatchQueue && (
              <a 
                href={`/${slug}/dispatch`} 
                className="flex items-center space-x-3.5 px-3 py-3 rounded-2xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-semibold text-xs transition-all duration-200 whitespace-nowrap"
              >
                <svg className="w-5 h-5 shrink-0 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" x2="12" y1="22.08" y2="12" /></svg>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 tracking-wide">DISPATCH Controls</span>
              </a>
            )}

            {effectiveModules.hasStorefront && (
              <a 
                href={`/${slug}/storefront`} 
                className="flex items-center space-x-3.5 px-3 py-3 rounded-2xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-semibold text-xs transition-all duration-200 whitespace-nowrap"
              >
                <svg className="w-5 h-5 shrink-0 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><line x1="3" x2="21" y1="6" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 tracking-wide">STOREFRONT Controls</span>
              </a>
            )}

            {effectiveModules.hasERP && (
              <a 
                href={`/${slug}/finance`} 
                className="flex items-center space-x-3.5 px-3 py-3 rounded-2xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-semibold text-xs transition-all duration-200 whitespace-nowrap"
              >
                <svg className="w-5 h-5 shrink-0 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24"><line x1="18" x2="18" y1="20" y2="10" /><line x1="12" x2="12" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="14" /></svg>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 tracking-wide">ERP Controls</span>
              </a>
            )}

            {/* CONDITIONAL CATERING QUOTATION SIDEBAR LINK */}
            {business?.has_catering_quotation === true && (
              <a 
                href={`/${slug}/quotation`} 
                className="flex items-center space-x-3.5 px-3 py-3 rounded-2xl text-amber-700 hover:bg-amber-50 font-semibold text-xs transition-all duration-200 whitespace-nowrap border border-amber-200"
              >
                <svg className="w-5 h-5 shrink-0 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 tracking-wide">Catering Quotations</span>
              </a>
            )}

            {/* Reports & Database Collapsible Category Section */}
            <div className="pt-3 pb-1">
              <button 
                onClick={() => setIsReportsMenuOpen(!isReportsMenuOpen)}
                className="w-full flex items-center justify-between px-3 py-3 rounded-2xl text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-semibold text-xs transition-all cursor-pointer whitespace-nowrap"
              >
                <div className="flex items-center space-x-3.5">
                  <svg className="w-5 h-5 shrink-0 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 tracking-wide">Reports & Database</span>
                </div>
                <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200 opacity-0 group-hover:opacity-100 transition-opacity">{isReportsMenuOpen ? '▼' : '▶'}</span>
              </button>

              {isReportsMenuOpen && (
                <div className="space-y-1 pl-4 pt-1.5 border-l-2 border-blue-500 ml-4 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button 
                    onClick={() => selectReportView('cash_liquidity')}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl font-medium text-[11px] transition-all text-left cursor-pointer whitespace-nowrap ${
                      activeReportView === 'cash_liquidity' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span>💵</span>
                    <span>Cash Liquidity Report</span>
                  </button>
                  <button 
                    onClick={() => selectReportView('sales')}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl font-medium text-[11px] transition-all text-left cursor-pointer whitespace-nowrap ${
                      activeReportView === 'sales' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span>📈</span>
                    <span>Sales Report</span>
                  </button>
                  <button 
                    onClick={() => selectReportView('sales_returns')}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl font-medium text-[11px] transition-all text-left cursor-pointer whitespace-nowrap ${
                      activeReportView === 'sales_returns' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span>🔄</span>
                    <span>Sales Return Report</span>
                  </button>
                  <button 
                    onClick={() => selectReportView('customers')}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl font-medium text-[11px] transition-all text-left cursor-pointer whitespace-nowrap ${
                      activeReportView === 'customers' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span>👥</span>
                    <span>Customer Database</span>
                  </button>
                  <button 
                    onClick={() => selectReportView('staff')}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl font-medium text-[11px] transition-all text-left cursor-pointer whitespace-nowrap ${
                      activeReportView === 'staff' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
              className="w-full flex items-center space-x-3.5 px-3 py-3 rounded-2xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-semibold text-xs transition-all text-left cursor-pointer whitespace-nowrap"
            >
              <svg className="w-5 h-5 shrink-0 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 tracking-wide">General Settings</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 whitespace-nowrap">
          <button 
            onClick={handleSignOut}
            className="w-full py-2.5 bg-white hover:bg-red-50 text-slate-700 hover:text-red-600 rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center space-x-2 border border-slate-200 hover:border-red-200 shadow-2xs"
          >
            <svg className="w-4 h-4 shrink-0 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50">
        
        {/* STREAMLINED HERO COMMAND HEADER WITH INTEGRATED WELCOME BANNER BACKGROUND */}
        <header 
          className="sticky top-0 px-8 py-10 flex justify-between items-center shrink-0 z-30 shadow-md bg-cover bg-center border-b border-blue-200 text-white relative overflow-hidden"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(15, 23, 42, 0.95) 40%, rgba(30, 41, 59, 0.85) 80%, rgba(30, 41, 59, 0.5) 100%), url('${activeBannerImg}')`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-transparent to-indigo-600/30 pointer-events-none"></div>
          
          <div className="relative z-10 max-w-xl space-y-1.5">
            <span className="bg-blue-600/30 border border-blue-400/40 text-blue-200 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-lg tracking-widest backdrop-blur-md shadow-inner">
              Active {profile.displayName} Portal
            </span>
            <h2 className="text-sm font-black uppercase text-white tracking-wider">
              {activeReportView === null && `Welcome back, ${business?.name || 'Dashboard'}`}
              {activeReportView === 'sales' && 'Advanced Sales Report & Audit Hub'}
              {activeReportView === 'sales_returns' && 'Sales Return Passes & Audit Hub'}
              {activeReportView === 'cash_liquidity' && 'Cash Liquidity & Inflow Realization Hub'}
              {activeReportView === 'customers' && 'Customer Database & CRM Directory'}
              {activeReportView === 'staff' && 'Staff Directory & Security Badge Hub'}
            </h2>
            <p className="text-[10px] text-slate-300 leading-relaxed font-medium">Manage your catalog, POS terminals, staff access, and live business operations with high-performance real-time telemetry.</p>
          </div>

          <div className="relative z-10 flex items-center space-x-3">
            {activeReportView !== null && (
              <button 
                onClick={() => selectReportView(null)}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition-all cursor-pointer border border-white/20 backdrop-blur-md shadow-2xs"
              >
                ← Back to Home Dashboard
              </button>
            )}
            <div className="hidden md:flex flex-col items-end space-y-1">
              <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 backdrop-blur-xl shadow-md text-right">
                <span className="text-[9px] text-slate-300 block uppercase font-bold">System Status</span>
                <span className="text-[10px] font-mono font-black text-emerald-400 flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Operational 100%</span>
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* DASHBOARD BODY OR FULL-SCREEN REPORT VIEW */}
        <main className="flex-1 px-8 pt-6 pb-12 max-w-7xl mx-auto w-full space-y-6">
          
          {activeReportView === null ? (
            <>
              {/* FINANCIAL CHARTS & ANALYTICS HUB */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. SALES TREND GRAPH */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-black text-xs uppercase text-slate-900 tracking-wider flex items-center space-x-2">
                        <span>📈 Sales Trend Realization</span>
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Total gross revenue performance over selected timeframe.</p>
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 space-x-1 shadow-inner">
                      {[10, 15, 30].map(days => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setSalesDaysFilter(days)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            salesDaysFilter === days ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {days}D
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* STICKY TOP-CENTER INFO BOX */}
                  <div className="h-9 flex items-center justify-center">
                    {hoveredSalesDay ? (
                      <div className="bg-slate-900 text-white px-4 py-1.5 rounded-xl shadow-md text-center max-w-[240px] flex items-center justify-center transition-all border border-slate-700 animate-fadeIn">
                        <span className="text-[11px] font-mono font-black text-blue-400 truncate">
                          {hoveredSalesDay.formattedDate}: {business?.currency_symbol || 'Rs.'} {hoveredSalesDay.totalSale.toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <div className="text-[10px] font-medium text-slate-400 italic bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
                        Roll over any bar/candle to view specific day details
                      </div>
                    )}
                  </div>

                  <div className="h-48 flex items-end justify-between gap-1.5 pt-3 pb-2 px-3 border-b border-slate-100 bg-slate-50/70 rounded-2xl overflow-hidden shadow-inner">
                    {salesTrendData.map((item, idx) => {
                      const maxSale = Math.max(...salesTrendData.map(d => d.totalSale), 1)
                      const heightPercent = Math.max(10, Math.round((item.totalSale / maxSale) * 100))
                      return (
                        <div 
                          key={idx} 
                          className="flex-1 flex flex-col items-center h-full justify-end cursor-pointer group/bar"
                          onMouseEnter={() => setHoveredSalesDay(item)}
                          onMouseLeave={() => setHoveredSalesDay(null)}
                        >
                          <div 
                            className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 group-hover/bar:from-blue-500 group-hover/bar:to-indigo-400 rounded-t-md transition-all duration-300 shadow-sm"
                            style={{ height: `${heightPercent}%` }}
                          />
                          <span className="text-[8px] font-mono text-slate-400 mt-2 truncate w-full text-center group-hover/bar:text-slate-900 transition-colors font-medium">
                            {salesDaysFilter === 30 && idx % 3 !== 0 ? '' : item.formattedDate}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex justify-between items-center pt-2 text-[11px]">
                    <span className="text-slate-500 font-medium">Total Period Sales:</span>
                    <span className="font-mono font-black text-blue-600 text-sm tracking-wide">
                      {business?.currency_symbol || 'Rs.'} {salesTrendData.reduce((sum, d) => sum + d.totalSale, 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 2. TOP 10 SELLING ITEMS OR DEALS */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-black text-xs uppercase text-slate-900 tracking-wider flex items-center space-x-2">
                        <span>🔥 Top 10 Selling Items & Deals</span>
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Ranked by {topRankingMode === 'revenue' ? 'total revenue' : 'total units sold'} in last 30 days.</p>
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 space-x-1 shadow-inner">
                      <button
                        type="button"
                        onClick={() => setTopRankingMode('revenue')}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer uppercase ${
                          topRankingMode === 'revenue' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Revenue
                      </button>
                      <button
                        type="button"
                        onClick={() => setTopRankingMode('units')}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer uppercase ${
                          topRankingMode === 'units' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Units
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {topSellingItemsData.length > 0 ? (
                      topSellingItemsData.map((item, idx) => {
                        const maxVal = topRankingMode === 'revenue' 
                          ? Math.max(...topSellingItemsData.map(i => i.revenue), 1)
                          : Math.max(...topSellingItemsData.map(i => i.qty), 1)
                        const currentVal = topRankingMode === 'revenue' ? item.revenue : item.qty
                        const widthPercent = Math.max(12, Math.round((currentVal / maxVal) * 100))
                        
                        return (
                          <div key={idx} className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-2xs group/item hover:border-blue-300 transition-all">
                            <div className="flex justify-between items-center text-[11px]">
                              <div className="flex items-center space-x-2.5 truncate">
                                <span className="font-mono font-black text-blue-600 w-5 bg-blue-50 px-1 py-0.5 rounded text-center border border-blue-200">#{idx + 1}</span>
                                <span className="font-bold text-slate-800 truncate group-hover/item:text-slate-950">{item.name}</span>
                              </div>
                              <div className="flex items-center space-x-3 shrink-0 font-mono text-[11px]">
                                <span className="text-slate-500 font-medium">{item.qty} units</span>
                                <span className="font-bold text-blue-600">{business?.currency_symbol || 'Rs.'} {item.revenue.toLocaleString()}</span>
                              </div>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden border border-slate-300/60">
                              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500 shadow-2xs" style={{ width: `${widthPercent}%` }} />
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center py-12 text-slate-400 font-medium bg-slate-50 rounded-2xl border border-slate-200">
                        No item sales history recorded for the last 30 days yet.
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2 text-[11px] border-t border-slate-100">
                    <span className="text-slate-500 font-medium">Tracked Catalog Items:</span>
                    <span className="font-mono font-bold text-slate-800">{topSellingItemsData.length} items ranked</span>
                  </div>
                </div>

              </div>

              {/* DATABASE METRICS COUNTERS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-300 transition-all">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{profile.terminology.productsLabel}</span>
                    <div className="text-2xl font-black font-mono text-slate-900 mt-1 group-hover:text-blue-600 transition-colors">{stats.productsCount}</div>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 border border-blue-200 rounded-2xl flex items-center justify-center font-bold text-lg shadow-2xs">📦</div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-300 transition-all">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Active Categories</span>
                    <div className="text-2xl font-black font-mono text-slate-900 mt-1 group-hover:text-blue-600 transition-colors">{stats.categoriesCount}</div>
                  </div>
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-2xl flex items-center justify-center font-bold text-lg shadow-2xs">🏷</div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-300 transition-all">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Registered Staff</span>
                    <div className="text-2xl font-black font-mono text-slate-900 mt-1 group-hover:text-blue-600 transition-colors">{stats.staffCount}</div>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 border border-blue-200 rounded-2xl flex items-center justify-center font-bold text-lg shadow-2xs">👥</div>
                </div>

                {effectiveModules.hasTables ? (
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-300 transition-all">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Configured Tables</span>
                      <div className="text-2xl font-black font-mono text-slate-900 mt-1 group-hover:text-blue-600 transition-colors">{stats.tablesCount}</div>
                    </div>
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 border border-amber-200 rounded-2xl flex items-center justify-center font-bold text-lg shadow-2xs">🪑</div>
                  </div>
                ) : (
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-300 transition-all">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Operational Mode</span>
                      <div className="text-xs font-black text-blue-600 mt-1 uppercase tracking-wider flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                        <span>Optimized & Active</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-cyan-50 text-cyan-600 border border-cyan-200 rounded-2xl flex items-center justify-center font-bold text-lg shadow-2xs">⚡</div>
                  </div>
                )}
              </div>

              {/* CORE COMMAND MODULES */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center space-x-2">
                    <span>⚡ Core Command Modules</span>
                    <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full">Secure Protocol Active</span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">Real-time operational nodes</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {effectiveModules.hasPOS && (
                    <a href={`/${slug}/pos`} className="bg-white p-5 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 group space-y-3 border border-slate-200 hover:border-blue-400 hover:-translate-y-1">
                      <div className="flex justify-between items-center">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-lg shadow-md shadow-amber-500/20">🖥</div>
                        <span className="text-[9px] font-mono bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg font-bold uppercase">POS Live</span>
                      </div>
                      <h4 className="font-black text-xs tracking-wide text-slate-900 group-hover:text-blue-600 transition-colors">{profile.terminology.posTitle}</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Launch register & process orders.</p>
                    </a>
                  )}

                  {effectiveModules.hasKDS && (
                    <a href={`/${slug}/kds`} className="bg-white p-5 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 group space-y-3 border border-slate-200 hover:border-blue-400 hover:-translate-y-1">
                      <div className="flex justify-between items-center">
                        <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-red-600/20">🍳</div>
                        <span className="text-[9px] font-mono bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-lg font-bold uppercase">KDS Routing</span>
                      </div>
                      <h4 className="font-black text-xs tracking-wide text-slate-900 group-hover:text-blue-600 transition-colors">Kitchen Display (KDS)</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Real-time kitchen order tickets.</p>
                    </a>
                  )}

                  {effectiveModules.hasDispatchQueue && (
                    <a href={`/${slug}/dispatch`} className="bg-white p-5 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 group space-y-3 border border-slate-200 hover:border-blue-400 hover:-translate-y-1">
                      <div className="flex justify-between items-center">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-blue-600/20">📦</div>
                        <span className="text-[9px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg font-bold uppercase">Dispatch Live</span>
                      </div>
                      <h4 className="font-black text-xs tracking-wide text-slate-900 group-hover:text-blue-600 transition-colors">Dispatch & Fulfillment</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Manage delivery queue & rider assignment.</p>
                    </a>
                  )}

                  {effectiveModules.hasStorefront && (
                    <a href={`/${slug}/storefront`} className="bg-white p-5 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 group space-y-3 border border-slate-200 hover:border-blue-400 hover:-translate-y-1">
                      <div className="flex justify-between items-center">
                        <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-purple-600/20">🛍️</div>
                        <span className="text-[9px] font-mono bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-lg font-bold uppercase">Public Portal</span>
                      </div>
                      <h4 className="font-black text-xs tracking-wide text-slate-900 group-hover:text-blue-600 transition-colors">Live Storefront</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Customer-facing order portal.</p>
                    </a>
                  )}
                </div>
              </div>

              {/* ACTIVE POS SESSIONS & DEVICE LOCK CONTROL */}
              <div className="space-y-3.5 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center space-x-2">
                    <span>🟢 Active POS Sessions & Device Locks ({activeSessionsList.length})</span>
                    <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full">Live Monitor</span>
                  </h3>
                  <button 
                    type="button" 
                    onClick={() => business?.id && fetchActiveSessions(business.id)}
                    className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-[10px] font-bold shadow-2xs transition cursor-pointer flex items-center space-x-1"
                  >
                    <span>🔄</span>
                    <span>Refresh Sessions</span>
                  </button>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3.5">Staff Member & Role</th>
                        <th className="p-3.5">Department / Code</th>
                        <th className="p-3.5">Session Active Since</th>
                        <th className="p-3.5 text-right">Security Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loadingSessions ? (
                        <tr><td colSpan={4} className="text-center py-8 text-slate-400 font-bold">Querying active terminal sessions...</td></tr>
                      ) : activeSessionsList.length > 0 ? (
                        activeSessionsList.map(sess => {
                          const staffInfo = sess.staff_profiles || {}
                          const staffName = staffInfo.full_name || 'Staff Member'
                          const staffRole = staffInfo.role || 'Cashier'
                          const staffDept = staffInfo.department || 'General'
                          const staffCode = staffInfo.staff_code || 'N/A'
                          const loginTime = sess.last_heartbeat_at ? new Date(sess.last_heartbeat_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'
                          
                          return (
                            <tr key={sess.id} className="hover:bg-slate-50 transition">
                              <td className="p-3.5">
                                <div className="font-bold text-slate-900">{staffName}</div>
                                <div className="text-[10px] text-blue-600 font-semibold">{staffRole}</div>
                              </td>
                              <td className="p-3.5">
                                <div className="font-semibold text-slate-700">{staffDept}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{staffCode}</div>
                              </td>
                              <td className="p-3.5 font-mono text-[11px] text-slate-600">
                                {loginTime}
                              </td>
                              <td className="p-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleForceLogoutSession(sess.id, staffName)}
                                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-bold shadow-2xs transition cursor-pointer"
                                >
                                  Force Logout 🚫
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="text-center py-10 text-slate-400 font-medium">
                            No active POS sessions currently running. All terminal seats are fully available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* INVENTORY & MANAGEMENT MODULES */}
              <div className="space-y-3.5 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    🛠 Inventory & Administrative Management
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <a href={`/${slug}/products`} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:border-blue-400 hover:-translate-y-1 transition-all group space-y-2.5">
                    <div className="flex justify-between items-center">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold text-base shadow-2xs">📦</div>
                      <span className="text-[9px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg font-bold uppercase">Catalog</span>
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">Product & Inventory Management</h4>
                    <p className="text-[11px] text-slate-500">Categories, items, prices, modifiers, variants & bundles.</p>
                  </a>

                  <button 
                    onClick={() => { resetStaffForm(); fetchActiveSessions(business.id); setShowStaffDrawer(true); }}
                    className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:border-blue-400 hover:-translate-y-1 transition-all group space-y-2.5 text-left w-full cursor-pointer"
                  >
                    <div className="flex justify-between items-center">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center font-bold text-base shadow-2xs">🔑</div>
                      <span className="text-[9px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg font-bold uppercase">Security & PINs</span>
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">Staff & QR ID Badges</h4>
                    <p className="text-[11px] text-slate-500">Manage staff PINs, QR badges & active session locks.</p>
                  </button>

                  {effectiveModules.hasTables && (
                    <a href={`/${slug}/tables`} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:border-blue-400 hover:-translate-y-1 transition-all group space-y-2.5">
                      <div className="flex justify-between items-center">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold text-base shadow-2xs">🪑</div>
                        <span className="text-[9px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg font-bold uppercase">Seating</span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">Dine-In & Zone Management</h4>
                      <p className="text-[11px] text-slate-500">Configure hall zones, tables, and seating capacities.</p>
                    </a>
                  )}

                  <a href={`/${slug}/orders`} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:border-blue-400 hover:-translate-y-1 transition-all group space-y-2.5">
                    <div className="flex justify-between items-center">
                      <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center font-bold text-base shadow-2xs">📋</div>
                      <span className="text-[9px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg font-bold uppercase">Audit Log</span>
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">{profile.terminology.ordersLabel}</h4>
                    <p className="text-[11px] text-slate-500">Past transaction logs and customer order histories.</p>
                  </a>
                </div>
              </div>
            </>
          ) : (
            /* FULL-SCREEN REPORT VIEWS IN MAIN CONTENT AREA */
            <div className="space-y-4">
              
              {/* SUB-VIEW 1: SALES REPORT */}
              {activeReportView === 'sales' && (
                <div className="space-y-4">
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                    <div className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex justify-between items-center">
                      <span>🔍 Sales Report Filters</span>
                      <button 
                        onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setFilterCustQuery(''); setFilterOrderNo(''); setFilterOrderType('ALL'); setFilterPaymentMode('ALL'); setFilterWaiterName(''); setFilterRiderName(''); }}
                        className="text-rose-600 hover:underline font-bold text-[10px] cursor-pointer"
                      >
                        Clear Filters
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Date From</label>
                        <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-xs" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Date To</label>
                        <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-xs" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Customer Name / Phone</label>
                        <input type="text" placeholder="Search customer..." value={filterCustQuery} onChange={e => setFilterCustQuery(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-xs" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Order Number / ID</label>
                        <input type="text" placeholder="KB-..." value={filterOrderNo} onChange={e => setFilterOrderNo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-xs" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Order Type</label>
                        <select value={filterOrderType} onChange={e => setFilterOrderType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold uppercase text-xs">
                          <option value="ALL">ALL TYPES</option>
                          <option value="DINE-IN">DINE-IN</option>
                          <option value="TAKEAWAY">TAKEAWAY</option>
                          <option value="DELIVERY">DELIVERY</option>
                          <option value="COUNTER">COUNTER</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Payment Mode</label>
                        <select value={filterPaymentMode} onChange={e => setFilterPaymentMode(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold uppercase text-xs">
                          <option value="ALL">ALL MODES</option>
                          <option value="CASH">CASH</option>
                          <option value="CARD">CARD</option>
                          <option value="CASH ON DELIVERY">CASH ON DELIVERY</option>
                          <option value="DIGITAL WALLET">DIGITAL WALLET</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Waiter Name</label>
                        <input type="text" placeholder="Search waiter..." value={filterWaiterName} onChange={e => setFilterWaiterName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-xs" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Delivery Rider Name</label>
                        <input type="text" placeholder="Search rider..." value={filterRiderName} onChange={e => setFilterRiderName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-xs" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3.5">Order # / Date</th>
                          <th className="p-3.5">Type & Payment</th>
                          <th className="p-3.5">Customer Details</th>
                          <th className="p-3.5">Staff / Waiter / Rider</th>
                          <th className="p-3.5 text-right">Grand Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loadingSales ? (
                          <tr><td colSpan={5} className="text-center py-12 text-slate-400 font-bold">Querying sales archive...</td></tr>
                        ) : filteredSalesReports.length > 0 ? (
                          filteredSalesReports.map(ord => {
                            const isPendingCash = (ord.settlement_status || '').toUpperCase() === 'PENDING_CASH' || 
                              (!ord.settlement_status && (
                                ((ord.service_type || '').toUpperCase() === 'DINE-IN' && ord.waiter_name) ||
                                ((ord.service_type || '').toUpperCase() === 'DELIVERY' && (ord.payment_method || '').toUpperCase().includes('COD'))
                              ));

                            return (
                              <tr key={ord.id} className="hover:bg-slate-50 transition">
                                <td className="p-3.5">
                                  <div className="font-mono font-black text-slate-900">{ord.order_number ? `KB-${String(ord.order_number).padStart(6, '0')}` : 'SAVED'}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{new Date(ord.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                                </td>
                                <td className="p-3.5">
                                  <div className="flex items-center space-x-1.5 mb-1">
                                    <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[9px] uppercase border border-slate-200">{ord.service_type || 'COUNTER'}</span>
                                    <span className="text-[10px] text-blue-600 font-semibold">{ord.payment_method || 'CASH'}</span>
                                  </div>
                                  <div>
                                    {isPendingCash ? (
                                      <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider inline-flex items-center space-x-1 animate-pulse">
                                        <span>⏳</span>
                                        <span>PENDING CASH</span>
                                      </span>
                                    ) : (
                                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider inline-flex items-center space-x-1">
                                        <span>✓</span>
                                        <span>SETTLED</span>
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3.5">
                                  <div className="font-bold text-slate-900">{ord.customer_name || 'Walk-In'}</div>
                                  <div className="text-[10px] text-slate-500 font-mono">{ord.customer_phone || 'No Phone'}</div>
                                </td>
                                <td className="p-3.5 text-[11px] text-slate-600">
                                  <div>Waiter: <span className="font-bold text-slate-900">{ord.waiter_name || 'N/A'}</span></div>
                                  <div>Rider: <span className="font-bold text-slate-900">{ord.rider_name || ord.rider || 'N/A'}</span></div>
                                </td>
                                <td className="p-3.5 text-right font-mono font-black text-blue-600 text-sm">
                                  {business?.currency_symbol || 'Rs.'} {ord.total_amount}
                                </td>
                              </tr>
                            )
                          })
                        ) : (
                          <tr><td colSpan={5} className="text-center py-12 text-slate-400 font-medium">No matching sales records found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB-VIEW: SALES RETURN REPORT */}
              {activeReportView === 'sales_returns' && (
                <div className="space-y-4">
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                    <div className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex justify-between items-center">
                      <span>🔍 Sales Return Report Filters</span>
                      <button 
                        onClick={() => { setFilterSrrDateFrom(''); setFilterSrrDateTo(''); setFilterSrrNo(''); setFilterSrrOrderNo(''); setFilterSrrOrderType('ALL'); setFilterSrrItem(''); setFilterSrrAuthorizedBy(''); }}
                        className="text-rose-600 hover:underline font-bold text-[10px] cursor-pointer"
                      >
                        Clear Filters
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Date From</label>
                        <input type="date" value={filterSrrDateFrom} onChange={e => setFilterSrrDateFrom(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 font-mono text-xs" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Date To</label>
                        <input type="date" value={filterSrrDateTo} onChange={e => setFilterSrrDateTo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 font-mono text-xs" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">SRR Number</label>
                        <input type="text" placeholder="Search SRR..." value={filterSrrNo} onChange={e => setFilterSrrNo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono text-xs" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Order Number</label>
                        <input type="text" placeholder="Search order..." value={filterSrrOrderNo} onChange={e => setFilterSrrOrderNo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono text-xs" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Order Type</label>
                        <select value={filterSrrOrderType} onChange={e => setFilterSrrOrderType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold uppercase text-xs">
                          <option value="ALL">ALL TYPES</option>
                          <option value="DINE-IN">DINE-IN</option>
                          <option value="TAKEAWAY">TAKEAWAY</option>
                          <option value="DELIVERY">DELIVERY</option>
                          <option value="COUNTER">COUNTER</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Item Name</label>
                        <input type="text" placeholder="Search item..." value={filterSrrItem} onChange={e => setFilterSrrItem(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Authorized By</label>
                      <input type="text" placeholder="Search authorizer..." value={filterSrrAuthorizedBy} onChange={e => setFilterSrrAuthorizedBy(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs" />
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3.5">Date/Time</th>
                          <th className="p-3.5">SRR Number</th>
                          <th className="p-3.5">Order Number</th>
                          <th className="p-3.5">Order Type & Payment</th>
                          <th className="p-3.5">Returned Items Description</th>
                          <th className="p-3.5">Return Reason</th>
                          <th className="p-3.5">Authorized By</th>
                          <th className="p-3.5 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loadingSalesReturns ? (
                          <tr><td colSpan={8} className="text-center py-12 text-slate-400 font-bold">Querying sales return passes...</td></tr>
                        ) : filteredSalesReturnsReports.length > 0 ? (
                          filteredSalesReturnsReports.map(srr => (
                            <tr key={srr.id} className="hover:bg-slate-50 transition">
                              <td className="p-3.5 font-mono text-[10px] text-slate-400">
                                {new Date(srr.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </td>
                              <td className="p-3.5 font-mono font-black text-blue-600">{srr.srr_number}</td>
                              <td className="p-3.5 font-mono font-bold text-slate-900">{srr.order_number}</td>
                              <td className="p-3.5">
                                <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[9px] uppercase mr-1 border border-slate-200">{srr.order_type}</span>
                                <div className="text-[10px] text-blue-600 font-semibold mt-0.5">{srr.payment_mode}</div>
                              </td>
                              <td className="p-3.5 font-medium text-slate-800 max-w-xs">{srr.returned_items_description}</td>
                              <td className="p-3.5 text-rose-600 font-semibold">{srr.return_reason}</td>
                              <td className="p-3.5 font-bold text-slate-700">{srr.authorized_by}</td>
                              <td className="p-3.5 text-right font-mono font-black text-rose-600 text-sm">
                                {business?.currency_symbol || 'Rs.'} {srr.amount}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={8} className="text-center py-12 text-slate-400 font-medium">No sales return passes recorded matching the criteria.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB-VIEW: CASH LIQUIDITY REPORT */}
              {activeReportView === 'cash_liquidity' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                    <div>
                      <h3 className="font-black text-slate-900 uppercase tracking-wider text-xs">Cash Liquidity & Inflow Realization</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Tracks actual real cash drops deposited by staff and riders, excluding pending receivables.</p>
                    </div>
                    <button
                      onClick={() => { setShowSettlementModal(true); }}
                      className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-blue-500/20 border border-blue-400/30"
                    >
                      + Process Staff Cash Drop / Batch Settlement 💵
                    </button>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3.5">Date/Time</th>
                          <th className="p-3.5">Staff / Collector</th>
                          <th className="p-3.5">Payment Method</th>
                          <th className="p-3.5">Billed Amount</th>
                          <th className="p-3.5">Discount / Shortage</th>
                          <th className="p-3.5 text-right">Net Cash Received</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loadingLiquidity ? (
                          <tr><td colSpan={6} className="text-center py-12 text-slate-400 font-bold">Querying liquidity logs...</td></tr>
                        ) : cashLiquidityData.length > 0 ? (
                          cashLiquidityData.map(txn => (
                            <tr key={txn.id} className="hover:bg-slate-50 transition">
                              <td className="p-3.5 font-mono text-[10px] text-slate-400">{new Date(txn.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                              <td className="p-3.5 font-bold text-slate-900">{txn.staff_name || 'Staff Member'}</td>
                              <td className="p-3.5"><span className="bg-blue-50 text-blue-700 border border-blue-200 font-bold px-2 py-0.5 rounded text-[9px] uppercase">{txn.payment_method}</span></td>
                              <td className="p-3.5 font-mono text-slate-700">{business?.currency_symbol || 'Rs.'} {txn.billed_amount}</td>
                              <td className="p-3.5 font-mono text-rose-600">{business?.currency_symbol || 'Rs.'} {txn.discount_amount || '0.00'}</td>
                              <td className="p-3.5 text-right font-mono font-black text-blue-600 text-sm">{business?.currency_symbol || 'Rs.'} {txn.amount_received}</td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={6} className="text-center py-12 text-slate-400 font-medium">No cash liquidity transactions recorded yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB-VIEW 2: CUSTOMER DATABASE */}
              {activeReportView === 'customers' && (
                <div className="space-y-4">
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                    <div className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex justify-between items-center">
                      <span>🔍 Customer Database Filters</span>
                      <button 
                        onClick={() => { setFilterCustName(''); setFilterCustPhone(''); setFilterCustOrigin('ALL'); }}
                        className="text-rose-600 hover:underline font-bold text-[10px] cursor-pointer"
                      >
                        Clear Filters
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Customer Name</label>
                        <input type="text" placeholder="Search name..." value={filterCustName} onChange={e => setFilterCustName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-xs" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Mobile / Phone Number</label>
                        <input type="text" placeholder="Search phone..." value={filterCustPhone} onChange={e => setFilterCustPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-xs" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Registered Through</label>
                        <select value={filterCustOrigin} onChange={e => setFilterCustOrigin(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold uppercase text-xs">
                          <option value="ALL">ALL CHANNELS</option>
                          <option value="POS">POS TERMINAL</option>
                          <option value="STOREFRONT">STOREFRONT</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3.5">Customer Name & Phone</th>
                          <th className="p-3.5">Email Address</th>
                          <th className="p-3.5">Default Address</th>
                          <th className="p-3.5">Registered Through</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loadingCustomers ? (
                          <tr><td colSpan={4} className="text-center py-12 text-slate-400 font-bold">Querying customer database...</td></tr>
                        ) : filteredCustomers.length > 0 ? (
                          filteredCustomers.map(cust => (
                            <tr key={cust.id} className="hover:bg-slate-50 transition">
                              <td className="p-3.5">
                                <div className="font-bold text-slate-900">{cust.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{cust.phone}</div>
                              </td>
                              <td className="p-3.5 text-slate-600 font-mono">{cust.email || 'N/A'}</td>
                              <td className="p-3.5 text-slate-600">{cust.default_address || 'No Default Address'}</td>
                              <td className="p-3.5">
                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase ${
                                  (cust.origin || 'POS') === 'STOREFRONT' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>
                                  {cust.origin || 'POS'}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={4} className="text-center py-12 text-slate-400 font-medium">No customers registered in database yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB-VIEW 3: STAFF DATABASE */}
              {activeReportView === 'staff' && (
                <div className="space-y-4">
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                    <div className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex justify-between items-center">
                      <span>🔍 Staff Database Filters</span>
                      <button 
                        onClick={() => { setStaffFilterId(''); setStaffFilterName(''); setStaffFilterRole('ALL'); setStaffFilterDept('ALL'); }}
                        className="text-rose-600 hover:underline font-bold text-[10px] cursor-pointer"
                      >
                        Clear Filters
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Staff ID / Code</label>
                        <input type="text" placeholder="STF-..." value={staffFilterId} onChange={e => setStaffFilterId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono uppercase text-xs" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Staff Name</label>
                        <input type="text" placeholder="Search name..." value={staffFilterName} onChange={e => setStaffFilterName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-xs" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Role / Title</label>
                        <select value={staffFilterRole} onChange={e => setStaffFilterRole(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold uppercase text-xs">
                          <option value="ALL">ALL ROLES</option>
                          {roles.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Department</label>
                        <select value={staffFilterDept} onChange={e => setStaffFilterDept(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold uppercase text-xs">
                          <option value="ALL">ALL DEPARTMENTS</option>
                          {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3.5">Staff ID / Name</th>
                          <th className="p-3.5">Role & Title</th>
                          <th className="p-3.5">Department</th>
                          <th className="p-3.5">Security PIN</th>
                          <th className="p-3.5">QR Badge Token</th>
                          <th className="p-3.5 text-right">Badge Link</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStaffDatabase.length > 0 ? (
                          filteredStaffDatabase.map(st => (
                            <tr key={st.id} className="hover:bg-slate-50 transition">
                              <td className="p-3.5">
                                <div className="font-bold text-slate-900">{st.full_name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{st.staff_code || 'N/A'}</div>
                              </td>
                              <td className="p-3.5 font-bold text-blue-600">{st.role}</td>
                              <td className="p-3.5 text-slate-700 font-semibold">{st.department || 'General'}</td>
                              <td className="p-3.5 font-mono font-bold text-slate-900">{st.pin_code}</td>
                              <td className="p-3.5 font-mono text-[10px] text-blue-600 select-all font-bold">{st.qr_token || 'N/A'}</td>
                              <td className="p-3.5 text-right">
                                <button 
                                  onClick={() => setBadgePreviewStaff(st)}
                                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-bold shadow-2xs transition cursor-pointer"
                                >
                                  View Badge 🪪
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={6} className="text-center py-12 text-slate-400 font-medium">No staff members match the selected filters.</td></tr>
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
          <div onClick={() => setShowStaffDrawer(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen md:w-[38vw] bg-white border-l border-slate-200 shadow-2xl flex flex-col text-slate-800">
              
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">🔑</span>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Staff & QR Security Manager</h2>
                    <p className="text-[11px] text-slate-500">Manage staff profiles, PINs & module access</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowStaffDrawer(false)}
                  className="w-8 h-8 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center font-bold transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                <form onSubmit={handleSaveStaff} className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-4 text-xs shadow-2xs">
                  <div className="flex justify-between items-center">
                    <h3 className="font-black uppercase tracking-wide text-blue-600">
                      {editingStaffId ? '✏️ Edit Staff Profile' : '+ Register New Staff Member'}
                    </h3>
                    {editingStaffId && (
                      <button 
                        type="button" 
                        onClick={resetStaffForm}
                        className="text-[11px] text-slate-500 hover:text-slate-900 font-bold underline cursor-pointer"
                      >
                        Cancel Editing
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1.5">Staff Full Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. John Doe"
                        value={newStaffName}
                        onChange={e => setNewStaffName(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                        required 
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1.5">Staff ID / Code</label>
                        <div className="flex space-x-1.5">
                          <input 
                            type="text" 
                            placeholder="STF-001"
                            value={newStaffCode}
                            onChange={e => setNewStaffCode(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-mono text-xs uppercase"
                          />
                          <button 
                            type="button" 
                            onClick={() => setNewStaffCode(generateDefaultStaffCode())}
                            className="px-3 bg-slate-200 hover:bg-slate-300 rounded-xl text-[10px] font-bold text-slate-700 shrink-0 cursor-pointer border border-slate-300"
                            title="Auto-generate ID"
                          >
                            Auto
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1.5">Department / Section</label>
                        <div className="space-y-2">
                          <div className="flex space-x-1.5">
                            <select
                              value={newStaffDept}
                              onChange={e => setNewStaffDept(e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-medium text-xs"
                            >
                              {departments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                              ))}
                            </select>
                            {departments.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveDepartment(newStaffDept)}
                                className="px-2.5 bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 rounded-xl text-[10px] font-bold cursor-pointer"
                                title="Remove selected department"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          <div className="flex space-x-1.5">
                            <input
                              type="text"
                              placeholder="New department..."
                              value={newDeptInput}
                              onChange={e => setNewDeptInput(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900"
                            />
                            <button
                              type="button"
                              onClick={handleAddDepartment}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-bold shrink-0 cursor-pointer shadow-2xs"
                            >
                              + Add
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1.5">Role / Title</label>
                      <div className="space-y-2">
                        <div className="flex space-x-1.5">
                          <select
                            value={newStaffRole}
                            onChange={e => setNewStaffRole(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium"
                          >
                            {roles.map(role => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                          {roles.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRole(newStaffRole)}
                              className="px-3 bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 rounded-xl text-[10px] font-bold cursor-pointer"
                              title="Remove selected role"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <div className="flex space-x-1.5">
                          <input
                            type="text"
                            placeholder="New role / title..."
                            value={newRoleInput}
                            onChange={e => setNewRoleInput(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900"
                          />
                          <button
                            type="button"
                            onClick={handleAddRole}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-bold shrink-0 cursor-pointer shadow-2xs"
                          >
                            + Add Role
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1.5">Security PIN (4-6 Digits)</label>
                        <input 
                          type="text" 
                          maxLength={6}
                          placeholder="1234"
                          value={newStaffPin}
                          onChange={e => setNewStaffPin(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono tracking-widest focus:outline-none focus:border-blue-600 font-bold"
                          required 
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1.5">Custom QR Token (Optional)</label>
                        <input 
                          type="text" 
                          placeholder="STAFF-..."
                          value={newStaffCustomToken}
                          onChange={e => setNewStaffCustomToken(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono text-[10px]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <span className="font-bold text-slate-700 block">Granular Module Permissions:</span>
                    <div className="grid grid-cols-3 gap-2.5">
                      {effectiveModules.hasPOS && (
                        <label className="flex items-center space-x-2 bg-white p-3 rounded-xl border border-slate-200 cursor-pointer hover:border-slate-300">
                          <input type="checkbox" checked={staffPos} onChange={e => setStaffPos(e.target.checked)} className="rounded bg-slate-50 border-slate-300 text-blue-600 focus:ring-0 w-4 h-4" />
                          <span className="font-semibold text-slate-800">POS Terminal</span>
                        </label>
                      )}
                      {effectiveModules.hasKDS && (
                        <label className="flex items-center space-x-2 bg-white p-3 rounded-xl border border-slate-200 cursor-pointer hover:border-slate-300">
                          <input type="checkbox" checked={staffKds} onChange={e => setStaffKds(e.target.checked)} className="rounded bg-slate-50 border-slate-300 text-blue-600 focus:ring-0 w-4 h-4" />
                          <span className="font-semibold text-slate-800">Kitchen KDS</span>
                        </label>
                      )}
                      {effectiveModules.hasERP && (
                        <label className="flex items-center space-x-2 bg-white p-3 rounded-xl border border-slate-200 cursor-pointer hover:border-slate-300">
                          <input type="checkbox" checked={staffErp} onChange={e => setStaffErp(e.target.checked)} className="rounded bg-slate-50 border-slate-300 text-blue-600 focus:ring-0 w-4 h-4" />
                          <span className="font-semibold text-slate-800">ERP & Finance</span>
                        </label>
                      )}
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={savingStaff}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition shadow-md shadow-blue-500/20 text-xs uppercase tracking-wider cursor-pointer border border-blue-400/30"
                  >
                    {savingStaff ? 'Saving Staff Profile...' : editingStaffId ? 'Update Staff Profile 💾' : 'Save Staff & Issue QR ID Badge 🆔'}
                  </button>
                </form>

                <div className="space-y-3">
                  <h3 className="font-black text-slate-900 uppercase tracking-wider text-xs">Registered Staff Directory ({staffList.length})</h3>
                    
                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3.5">Staff ID / Name / Dept</th>
                          <th className="p-3.5">PIN</th>
                          <th className="p-3.5">QR Badge Token</th>
                          <th className="p-3.5">Permissions</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {staffList.length > 0 ? staffList.map(st => (
                          <tr key={st.id} className="hover:bg-slate-50 transition">
                            <td className="p-3.5">
                              <div className="font-bold text-slate-900">{st.full_name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{st.staff_code || 'N/A'} • {st.department || 'General'}</div>
                              <div className="text-[9px] text-slate-500 uppercase font-semibold">{st.role}</div>
                            </td>
                            <td className="p-3.5 font-mono font-bold text-slate-700">
                              {st.pin_code}
                            </td>
                            <td className="p-3.5 font-mono text-[10px] text-blue-600 select-all font-bold">
                              {st.qr_token || 'N/A'}
                            </td>
                            <td className="p-3.5">
                              <div className="flex flex-wrap gap-1">
                                {st.access_pos && <span className="bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded text-[9px] font-bold">POS</span>}
                                {st.access_kds && <span className="bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded text-[9px] font-bold">KDS</span>}
                                {st.access_erp && <span className="bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded text-[9px] font-bold">ERP</span>}
                              </div>
                            </td>
                            <td className="p-3.5 text-right space-x-1">
                              <button 
                                onClick={() => setBadgePreviewStaff(st)}
                                className="text-blue-600 hover:text-blue-800 font-bold text-xs px-2 py-1 rounded hover:bg-blue-50 transition cursor-pointer"
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
                                className="text-rose-600 hover:text-rose-800 font-bold text-xs px-2 py-1 rounded hover:bg-rose-50 transition cursor-pointer"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-slate-400">No staff members registered yet.</td>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs font-sans">
          <div className="bg-white border border-slate-200 rounded-3xl p-7 max-w-sm w-full text-center space-y-5 shadow-2xl text-slate-800">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 border border-blue-200 rounded-2xl mx-auto flex items-center justify-center text-2xl font-bold shadow-2xs">
              🪪
            </div>
            <div>
              <h3 className="font-black text-base uppercase text-slate-900 tracking-wide">{badgePreviewStaff.full_name}</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {badgePreviewStaff.role} • Dept: {badgePreviewStaff.department || 'General'} • PIN: <span className="font-mono font-bold text-slate-900">{badgePreviewStaff.pin_code}</span>
              </p>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col items-center justify-center shadow-inner">
              <div id="staff-qr-badge-svg" className="bg-white p-3 rounded-2xl shadow-md border border-slate-200">
                <QRCodeSVG value={badgePreviewStaff.qr_token || 'N/A'} size={144} level="H" includeMargin={true} />
              </div>
              <span className="mt-4 font-mono text-[11px] text-blue-700 font-bold bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 select-all">
                {badgePreviewStaff.qr_token || 'N/A'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button 
                type="button"
                onClick={downloadQrBadgePng}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-500 transition cursor-pointer shadow-md shadow-blue-500/20 border border-blue-400/30"
              >
                ⬇️ Download PNG Badge
              </button>
              <button 
                type="button"
                onClick={() => setBadgePreviewStaff(null)}
                className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 transition cursor-pointer border border-slate-200"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAFF CASH DROP & BATCH SETTLEMENT SLIDE-OVER DRAWER */}
      {showSettlementModal && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans">
          <div onClick={() => setShowSettlementModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen md:w-[55vw] bg-white border-l border-slate-200 shadow-2xl flex flex-col text-slate-800">
              
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="font-black text-sm uppercase text-slate-900 tracking-wide">Staff Cash Drop & Batch Settlement</h3>
                  <p className="text-[10px] text-slate-500">Select staff member, review pending bills, and settle cash with adjustments.</p>
                </div>
                <button onClick={() => setShowSettlementModal(false)} className="w-8 h-8 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center font-bold transition cursor-pointer">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <form onSubmit={handleProcessBatchSettlement} className="space-y-5 text-xs">
                  
                  {/* TWO SEPARATE FIELDS WITH SEARCH FOR WAITER & RIDER SIDE-BY-SIDE */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 space-y-2.5">
                      <label className="block font-bold text-slate-900 uppercase tracking-wider text-[11px]">1. Select Waiter for Cash Settlement</label>
                      <input
                        type="text"
                        placeholder="Search waiter by name..."
                        value={waiterSearch}
                        onChange={e => setWaiterSearch(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Escape') setWaiterSearch('') }}
                        className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-blue-600"
                      />
                      <select
                        value={waitersList.some(st => st.full_name === selectedStaffForSettlement || st.id === selectedStaffForSettlement) ? selectedStaffForSettlement : ''}
                        onChange={e => {
                          const val = e.target.value
                          setSelectedStaffForSettlement(val)
                          if (val) fetchPendingOrdersForStaff(val)
                        }}
                        size={waiterSearch.trim() ? Math.min(Math.max(waitersList.length + 1, 2), 5) : 1}
                        className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2.5 font-bold cursor-pointer"
                      >
                        <option value="">-- Choose Waiter --</option>
                        {waitersList.map(st => (
                          <option key={st.id} value={st.full_name}>{st.full_name} ({st.role || 'Waiter'})</option>
                        ))}
                      </select>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 space-y-2.5">
                      <label className="block font-bold text-slate-900 uppercase tracking-wider text-[11px]">2. Select Rider for Cash Settlement</label>
                      <input
                        type="text"
                        placeholder="Search rider by name..."
                        value={riderSearch}
                        onChange={e => setRiderSearch(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Escape') setRiderSearch('') }}
                        className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-blue-600"
                      />
                      <select
                        value={ridersList.some(st => st.full_name === selectedStaffForSettlement || st.id === selectedStaffForSettlement) ? selectedStaffForSettlement : ''}
                        onChange={e => {
                          const val = e.target.value
                          setSelectedStaffForSettlement(val)
                          if (val) fetchPendingOrdersForStaff(val)
                        }}
                        size={riderSearch.trim() ? Math.min(Math.max(ridersList.length + 1, 2), 5) : 1}
                        className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2.5 font-bold cursor-pointer"
                      >
                        <option value="">-- Choose Rider --</option>
                        {ridersList.map(st => (
                          <option key={st.id} value={st.id}>{st.full_name || st.name} ({st.role || 'Rider'})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedStaffForSettlement && (
                    <div className="space-y-3">
                      <h4 className="font-bold uppercase text-slate-700 text-[11px]">Pending Cash Invoices ({pendingOrdersForStaff.length})</h4>
                      {pendingOrdersForStaff.length > 0 ? (
                        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                          {pendingOrdersForStaff.map(ord => {
                            const input = settlementInputs[ord.id] || { received: ord.total_amount, discount: '0', notes: '' }
                            return (
                              <div key={ord.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                                <div className="flex justify-between items-center">
                                  <span className="font-mono font-black text-slate-900">KB-{String(ord.order_number).padStart(6, '0')}</span>
                                  <span className="font-mono font-bold text-blue-600">Total Billed: {ord.total_amount}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2.5">
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-500 mb-1">Cash Received</label>
                                    <input
                                      type="number"
                                      value={input.received}
                                      onChange={e => {
                                        const val = e.target.value
                                        const billed = parseFloat(ord.total_amount) || 0
                                        const rec = parseFloat(val) || 0
                                        const diff = Math.max(0, billed - rec)
                                        setSettlementInputs({
                                          ...settlementInputs,
                                          [ord.id]: { ...input, received: val, discount: String(diff) }
                                        })
                                      }}
                                      className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 font-mono font-bold"
                                      required
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-500 mb-1">Discount / Shortage</label>
                                    <input
                                      type="number"
                                      value={input.discount}
                                      onChange={e => setSettlementInputs({
                                        ...settlementInputs,
                                        [ord.id]: { ...input, discount: e.target.value }
                                      })}
                                      className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 font-mono text-rose-600 font-bold"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-500 mb-1">Remarks</label>
                                    <input
                                      type="text"
                                      placeholder="Reason..."
                                      value={input.notes}
                                      onChange={e => setSettlementInputs({
                                        ...settlementInputs,
                                        [ord.id]: { ...input, notes: e.target.value }
                                      })}
                                      className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2"
                                    />
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-slate-400 py-6 text-center bg-slate-50 rounded-2xl border border-slate-200">No pending cash orders assigned to this staff member.</p>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                    <div className="font-mono font-black text-xs text-slate-900">
                      TOTAL: <span className="text-blue-600">{business?.currency_symbol || 'Rs.'} {pendingOrdersForStaff.reduce((sum, ord) => sum + (parseFloat(ord.total_amount) || 0), 0).toFixed(2)}</span>
                    </div>
                    <div className="flex space-x-2.5">
                      <button type="button" onClick={() => setShowSettlementModal(false)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer border border-slate-200">Cancel/Close</button>
                      <button
                        type="submit"
                        disabled={processingSettlement || pendingOrdersForStaff.length === 0}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer border border-blue-400/30"
                      >
                        {processingSettlement ? 'Processing...' : 'Settle Selected Invoices & Record Liquidity 💵'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* BUSINESS SETTINGS DRAWER */}
      {showSettingsDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans">
          <div onClick={() => setShowSettingsDrawer(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col text-slate-800">
              
              <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <div className="flex items-center space-x-2.5">
                  <span className="text-lg">⚙️</span>
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">Business Settings</h2>
                </div>
                <button 
                  onClick={() => setShowSettingsDrawer(false)}
                  className="w-8 h-8 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center font-bold transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <form onSubmit={handleSaveSettings} id="business-settings-form" className="space-y-4 text-xs">
                  
                  {/* Sequence Starting Points & Prefixes Configuration */}
                  <div className="space-y-3 pt-1">
                    <label className="block text-slate-700 font-bold uppercase tracking-wider text-[11px]">Sequence Starting Points & Prefixes</label>
                    <p className="text-[10px] text-slate-500">Configure starting number and custom 1–5 letter prefix for each sequence.</p>
                     
                    <div className="space-y-2.5">
                      {/* Order No */}
                      <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Order No. Start</label>
                          <input type="number" value={editNextOrderSeq} onChange={e => setEditNextOrderSeq(e.target.value)} className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 font-mono text-xs font-bold" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Prefix (1-5 chars)</label>
                          <input type="text" maxLength={5} placeholder="ORD" value={editOrderPrefix} onChange={e => setEditOrderPrefix(e.target.value)} className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 font-mono text-xs uppercase font-bold" />
                        </div>
                      </div>

                      {/* Serial No */}
                      <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Serial No. Start</label>
                          <input type="number" value={editNextSerialSeq} onChange={e => setEditNextSerialSeq(e.target.value)} className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 font-mono text-xs font-bold" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Prefix (1-5 chars)</label>
                          <input type="text" maxLength={5} placeholder="SRL" value={editSerialPrefix} onChange={e => setEditSerialPrefix(e.target.value)} className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 font-mono text-xs uppercase font-bold" />
                        </div>
                      </div>

                      {/* KOT No */}
                      <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">KOT No. Start</label>
                          <input type="number" value={editNextKotSeq} onChange={e => setEditNextKotSeq(e.target.value)} className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 font-mono text-xs font-bold" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Prefix (1-5 chars)</label>
                          <input type="text" maxLength={5} placeholder="KOT" value={editKotPrefix} onChange={e => setEditKotPrefix(e.target.value)} className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 font-mono text-xs uppercase font-bold" />
                        </div>
                      </div>

                      {/* SRR No */}
                      <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">SRR No. Start</label>
                          <input type="number" value={editNextSrrSeq} onChange={e => setEditNextSrrSeq(e.target.value)} className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 font-mono text-xs font-bold" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Prefix (1-5 chars)</label>
                          <input type="text" maxLength={5} placeholder="SRR" value={editSrrPrefix} onChange={e => setEditSrrPrefix(e.target.value)} className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 font-mono text-xs uppercase font-bold" />
                        </div>
                      </div>

                      {/* Quotation No */}
                      <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Quotation No. Start</label>
                          <input type="number" value={editNextQuotationSeq} onChange={e => setEditNextQuotationSeq(e.target.value)} className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 font-mono text-xs font-bold" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Prefix (1-5 chars)</label>
                          <input type="text" maxLength={5} placeholder="QUOT" value={editQuotationPrefix} onChange={e => setEditQuotationPrefix(e.target.value)} className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-3 py-2 font-mono text-xs uppercase font-bold" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tenant Granular Module Access */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-200">
                    <label className="block text-slate-700 font-bold">Tenant Granular Module Access</label>
                    <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={editHasPos} onChange={e => setEditHasPos(e.target.checked)} className="rounded bg-white border-slate-300 text-blue-600 focus:ring-0 w-4 h-4" />
                        <span className="font-semibold text-slate-800">POS Terminal</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={editHasKds} onChange={e => setEditHasKds(e.target.checked)} className="rounded bg-white border-slate-300 text-blue-600 focus:ring-0 w-4 h-4" />
                        <span className="font-semibold text-slate-800">Kitchen KDS</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={editHasDispatchQueue} onChange={e => setEditHasDispatchQueue(e.target.checked)} className="rounded bg-white border-slate-300 text-blue-600 focus:ring-0 w-4 h-4" />
                        <span className="font-semibold text-slate-800">Dispatch Queue</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={editHasErp} onChange={e => setEditHasErp(e.target.checked)} className="rounded bg-white border-slate-300 text-blue-600 focus:ring-0 w-4 h-4" />
                        <span className="font-semibold text-slate-800">ERP & Finance</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={editHasTables} onChange={e => setEditHasTables(e.target.checked)} className="rounded bg-white border-slate-300 text-blue-600 focus:ring-0 w-4 h-4" />
                        <span className="font-semibold text-slate-800">Dine-In Tables</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <label className="block text-slate-700 font-bold">Business Logo</label>
                    <div className="flex items-center space-x-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 p-1">
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
                          className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
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
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono text-[11px]" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <label className="block text-slate-700 font-bold">Custom Welcome Banner</label>
                    <div className="flex items-center space-x-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      <div className="w-16 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
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
                          className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
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
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono text-[11px]" 
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <label className="block text-slate-700 font-bold mb-1">Contact / WhatsApp Number</label>
                    <input 
                      type="text" 
                      value={editPhone} 
                      onChange={e => setEditPhone(e.target.value)} 
                      placeholder="+92 300 0000000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Business E-Mail</label>
                    <input 
                      type="email" 
                      value={editEmail} 
                      onChange={e => setEditEmail(e.target.value)} 
                      placeholder="store@domain.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Business Website URL</label>
                    <input 
                      type="text" 
                      value={editWebUrl} 
                      onChange={e => setEditWebUrl(e.target.value)} 
                      placeholder="https://yourdomain.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Business Address</label>
                    <textarea 
                      rows={2}
                      value={editAddress} 
                      onChange={e => setEditAddress(e.target.value)} 
                      placeholder="Street, Area, City"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-blue-600 resize-none"
                    />
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-slate-200 bg-slate-50 space-y-3">
                <button 
                  type="submit" 
                  form="business-settings-form"
                  disabled={savingSettings || uploadingLogo || uploadingBanner}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-md shadow-blue-500/20 text-xs cursor-pointer border border-blue-400/30"
                >
                  {savingSettings ? 'Saving Changes...' : 'Save Credentials 💾'}
                </button>

                <button 
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold transition text-xs flex items-center justify-center space-x-2 shadow-2xs cursor-pointer"
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