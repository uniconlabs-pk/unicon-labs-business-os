'use client'

import { useState, useEffect, use, useMemo, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { getBusinessProfile } from '@/lib/businessProfiles'
import SecurityGateModal from '@/components/SecurityGateModal'
import ThermalReceipt from '../../components/ThermalReceipt'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface PageProps {
  params: Promise<{ slug: string }>
}

interface TenderSplit {
  method: 'CASH' | 'CARD' | 'DIGITAL WALLET' | 'BANK TRANSFER' | 'CASH ON DELIVERY'
  amount: number
}

export default function AdaptiveSmartPOSTerminal({ params }: PageProps) {
  const { slug } = use(params)
  const router = useRouter()
  const printReceiptRef = useRef<HTMLDivElement>(null)
  const printKotRef = useRef<HTMLDivElement>(null)
  const printSrrRef = useRef<HTMLDivElement>(null)

  const [business, setBusiness] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [serviceType, setServiceType] = useState<'DINE-IN' | 'TAKEAWAY' | 'DELIVERY' | 'COUNTER'>('TAKEAWAY')
  
  // Waiter Attribution State
  const [waiters, setWaiters] = useState<any[]>([])
  const [selectedWaiter, setSelectedWaiter] = useState<any>(null)

  // Customer & Delivery Metadata State
  const [customerName, setCustomerName] = useState('Walk-In Customer')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryNote, setDeliveryNote] = useState('')
  const [crmStatus, setCrmStatus] = useState<'idle' | 'searching' | 'found' | 'new'>('idle')

  // Assign Waiter Search & Text State for Smart Type Matching
  const [waiterSearchInput, setWaiterSearchInput] = useState('')
  const [showWaiterDropdown, setShowWaiterDropdown] = useState(false)

  // New Customer Modal State (with optional address field and exact field sequence)
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false)
  const [newCustNameInput, setNewCustNameInput] = useState('')
  const [newCustEmailInput, setNewCustEmailInput] = useState('')
  const [newCustAddressInput, setNewCustAddressInput] = useState('')
  const [savingNewCustomer, setSavingNewCustomer] = useState(false)

  // Security Gate & Staff Authentication States (with sessionStorage hydration)
  const [authenticatedStaff, setAuthenticatedStaff] = useState<any>(null)
  const [showSecurityGate, setShowSecurityGate] = useState(true)
  
  // Invoice Recall & Advanced Full-Screen View States
  const [isRecallViewActive, setIsRecallViewActive] = useState(false)
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [loadingRecall, setLoadingRecall] = useState(false)
  
  // Search Filters for Recall View
  const [recallSearchOrderNo, setRecallSearchOrderNo] = useState('')
  const [recallSearchSerial, setRecallSearchSerial] = useState('')
  const [recallSearchCustName, setRecallSearchCustName] = useState('')
  const [recallSearchPhone, setRecallSearchPhone] = useState('')
  const [recallDateFrom, setRecallDateFrom] = useState('')
  const [recallDateTo, setRecallDateTo] = useState('')

  // Refund & Return Workflow States
  const [showRefundAuthModal, setShowRefundAuthModal] = useState(false)
  const [selectedOrderForRefund, setSelectedOrderForRefund] = useState<any>(null)
  const [refundManagerPin, setRefundManagerPin] = useState('')
  const [refundManagerQrToken, setRefundManagerQrToken] = useState('')
  const [refundItemsSelection, setRefundItemsSelection] = useState<{ [itemIndex: number]: { returnQty: number, maxQty: number } }>({})
  const [refundReasonCode, setRefundReasonCode] = useState('Quality Issue / Damaged')
  const [processingRefund, setProcessingRefund] = useState(false)
  
  // Print Sales Return Receipt State
  const [printSrrData, setPrintSrrData] = useState<any>(null)
  
  const [zones, setZones] = useState<string[]>([])
  const [tables, setTables] = useState<any[]>([])
  const [activeZone, setActiveZone] = useState('ALL')
  const [selectedTable, setSelectedTable] = useState<any>(null)

  const [tableCarts, setTableCarts] = useState<{ [key: string]: any[] }>({})
  const [tableOrderNumbers, setTableOrderNumbers] = useState<{ [key: string]: { code: string, intVal: number } }>({})
  const [reservations, setReservations] = useState<any[]>([])
  const [generalCart, setGeneralCart] = useState<any[]>([])
  const [generalOrderNumber, setGeneralOrderNumber] = useState<{ code: string, intVal: number } | null>(null)

  const [categories, setCategories] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [addOnsProducts, setAddOnsProducts] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Mirroring Dashboard Category Filter / Drilldown States
  const [selectedMotherCategoryFilter, setSelectedMotherCategoryFilter] = useState('ALL')
  const [selectedSubCategoryFilter, setSelectedSubCategoryFilter] = useState<string | null>(null)

  // Favorites / Fast-Moving Items management (Supabase persisted)
  const [favorites, setFavorites] = useState<any[]>([])
  const [isFavoriteManagerOpen, setIsFavoriteManagerOpen] = useState(false)
  const [favSearchQuery, setFavSearchQuery] = useState('')
  const [draggedFavIndex, setDraggedFavIndex] = useState<number | null>(null)

  const [showCustomizeModal, setShowCustomizeModal] = useState(false)
  const [customizingItem, setCustomizingItem] = useState<any>(null)
  const [selectedVariant, setSelectedVariant] = useState<any>(null)
  const [selectedAddons, setSelectedAddons] = useState<any[]>([])
  const [addonVariants, setAddonVariants] = useState<{ [addonId: string]: any }>({})

  // Service Charges, Discount, and Delivery Charges State
  const [serviceCharges, setServiceCharges] = useState<number>(0)
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [deliveryCharges, setDeliveryCharges] = useState<number>(0)

  // Settlement & Tender/Split Payment State
  const [showSettlementModal, setShowSettlementModal] = useState(false)
  const [isSplitPayment, setIsSplitPayment] = useState(false)
  const [singleMethod, setSingleMethod] = useState<'CASH' | 'CARD' | 'DIGITAL WALLET' | 'BANK TRANSFER' | 'CASH ON DELIVERY'>('CASH')
  const [singleReceivedCash, setSingleReceivedCash] = useState<number>(0)
  const [customReceivedCash, setCustomReceivedCash] = useState<string>('')
  const [tenderSplits, setTenderSplits] = useState<TenderSplit[]>([
    { method: 'CASH', amount: 0 },
    { method: 'CARD', amount: 0 }
  ])

  // Explicitly declared print state variables
  const [printOrderData, setPrintOrderData] = useState<any>(null)
  const [printKotData, setPrintKotData] = useState<any>(null)

  const [currentTime, setCurrentTime] = useState(new Date())

  // Dynamic available payment methods based strictly on Service Type
  const availableTenderMethods = useMemo(() => {
    if (serviceType === 'DELIVERY') {
      return ['CASH ON DELIVERY', 'CARD', 'DIGITAL WALLET', 'BANK TRANSFER', 'CASH'] as const
    }
    return ['CASH', 'CARD', 'DIGITAL WALLET', 'BANK TRANSFER'] as const
  }, [serviceType])

  // Context-aware payment fallback: ONLY trigger when serviceType changes
  useEffect(() => {
    if (serviceType === 'DELIVERY') {
      setSingleMethod('CASH ON DELIVERY')
    } else {
      setSingleMethod(prev => (prev === 'CASH ON DELIVERY' ? 'CASH' : prev))
      setTenderSplits(prev =>
        prev.map(t => (t.method === 'CASH ON DELIVERY' ? { ...t, method: 'CASH' } : t))
      )
    }
  }, [serviceType])

  // 1. Current Active Cart
  const currentCart = useMemo(() => {
    return profile?.modules?.hasTables && serviceType === 'DINE-IN' && selectedTable
      ? (tableCarts[selectedTable.id] || [])
      : generalCart
  }, [profile?.modules?.hasTables, serviceType, selectedTable, tableCarts, generalCart])

  // 2. Active Order Number Session Lock
  const activeOrderMeta = useMemo(() => {
    const baseSeq = Number(business?.next_order_seq ?? 100000)
    const hasItems = currentCart.length > 0

    if (profile?.modules?.hasTables && serviceType === 'DINE-IN' && selectedTable) {
      if (!hasItems) return null

      if (!tableOrderNumbers[selectedTable.id]) {
        const assignedInts = Object.values(tableOrderNumbers).map(o => o.intVal)
        const nextAvailableSeq = assignedInts.length > 0 ? Math.max(...assignedInts) + 1 : baseSeq

        const meta = { code: `KB-${String(nextAvailableSeq).padStart(6, '0')}`, intVal: nextAvailableSeq }
        setTableOrderNumbers(prev => ({ ...prev, [selectedTable.id]: meta }))
        return meta
      }
      return tableOrderNumbers[selectedTable.id]
    } else {
      if (!hasItems) return null

      if (!generalOrderNumber) {
        const meta = { code: `KB-${String(baseSeq).padStart(6, '0')}`, intVal: baseSeq }
        setGeneralOrderNumber(meta)
        return meta
      }
      return generalOrderNumber
    }
  }, [profile?.modules?.hasTables, serviceType, selectedTable, tableOrderNumbers, generalOrderNumber, business?.next_order_seq, currentCart.length])

  const activeOrderNumber = activeOrderMeta?.code || 'PENDING'
  const activeOrderInt = activeOrderMeta?.intVal || Number(business?.next_order_seq ?? 100000)

  // Filtered list of waiters matching the typed input
  const matchingWaiters = useMemo(() => {
    if (!waiterSearchInput.trim()) return waiters
    const query = waiterSearchInput.toLowerCase()
    return waiters.filter(w => (w.full_name || w.name || '').toLowerCase().includes(query))
  }, [waiters, waiterSearchInput])

  // 3. Filter recent orders for recall view
  const filteredRecallOrders = useMemo(() => {
    return recentOrders.filter(ord => {
      if (recallDateFrom) {
        const orderDate = new Date(ord.created_at).toISOString().split('T')[0]
        if (orderDate < recallDateFrom) return false
      }
      if (recallDateTo) {
        const orderDate = new Date(ord.created_at).toISOString().split('T')[0]
        if (orderDate > recallDateTo) return false
      }
      if (recallSearchCustName.trim()) {
        const cName = (ord.customer_name || '').toLowerCase()
        if (!cName.includes(recallSearchCustName.trim().toLowerCase())) return false
      }
      if (recallSearchPhone.trim()) {
        const phone = (ord.customer_phone || '')
        if (!phone.includes(recallSearchPhone.trim())) return false
      }
      if (recallSearchOrderNo.trim()) {
        const idStr = String(ord.order_number || ord.id || '').toLowerCase()
        if (!idStr.includes(recallSearchOrderNo.trim().toLowerCase())) return false
      }
      if (recallSearchSerial.trim()) {
        const serial = (ord.serial_number || '').toLowerCase()
        if (!serial.includes(recallSearchSerial.trim().toLowerCase())) return false
      }
      return true
    })
  }, [
    recentOrders,
    recallSearchOrderNo,
    recallSearchSerial,
    recallSearchCustName,
    recallSearchPhone,
    recallDateFrom,
    recallDateTo
  ])

  // Zone Grouping Memoized
  const posGroupedZones = useMemo(() => {
    if (activeZone !== 'ALL') {
      return [{
        zoneName: activeZone,
        tables: tables
          .filter(t => (t.zone || t.zone_name || 'MAIN HALL') === activeZone)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || (a.name || a.table_number || '').localeCompare(b.name || b.table_number || ''))
      }]
    }
    
    const groupsMap = new Map<string, any[]>()
    tables.forEach(t => {
      const zName = t.zone || t.zone_name || 'MAIN HALL'
      if (!groupsMap.has(zName)) {
        groupsMap.set(zName, [])
      }
      groupsMap.get(zName)?.push(t)
    })

    const configuredArrangement = business?.zone_arrangement || zones || []
    const allFetchedZones = Array.from(groupsMap.keys())

    const orderedZoneNames = [
      ...configuredArrangement.filter((z: string) => allFetchedZones.includes(z)),
      ...allFetchedZones.filter((z: string) => !configuredArrangement.includes(z))
    ]

    return orderedZoneNames.map(zName => ({
      zoneName: zName,
      tables: (groupsMap.get(zName) || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || (a.name || a.table_number || '').localeCompare(b.name || b.table_number || ''))
    })).filter(g => g.tables.length > 0)
  }, [activeZone, tables, zones, business?.zone_arrangement])

  // Category Tree Memoized
  const categoryTree = useMemo(() => {
    const flatList = categories || []
    const buildTree = (list: any[], parentId: string | null = null, depth = 1): any[] => {
      if (depth > 3) return []
      return list
        .filter(c => (c.parent_id || null) === parentId)
        .map(c => ({
          ...c,
          depth,
          children: buildTree(list, c.id, depth + 1)
        }))
    }
    return buildTree(flatList)
  }, [categories])

  const flattenedCategories = useMemo(() => {
    const flatten = (tree: any[]): any[] => {
      return tree.flatMap(node => [
        { id: node.id, name: node.name, label: `${'— '.repeat(node.depth - 1)}${node.name}`, depth: node.depth, parent_id: node.parent_id },
        ...flatten(node.children)
      ])
    }
    return flatten(categoryTree)
  }, [categoryTree])

  const motherCategories = useMemo(() => {
    return (categories || []).filter(c => !c.parent_id || c.parent_id === '')
  }, [categories])

  const activeMotherCategoryObj = useMemo(() => {
    if (selectedMotherCategoryFilter === 'ALL') return null
    return (categories || []).find(c => c.name === selectedMotherCategoryFilter) || null
  }, [selectedMotherCategoryFilter, categories])

  const activeSubcategories = useMemo(() => {
    if (!activeMotherCategoryObj) return []
    return (categories || []).filter(c => c.parent_id === activeMotherCategoryObj.id)
  }, [activeMotherCategoryObj, categories])

  const getDescendantNames = useMemo(() => {
    return (catNameVal: string): string[] => {
      const list = categories || []
      const catObj = list.find(c => c.name === catNameVal)
      if (!catObj) return [catNameVal]
      const getChildrenNames = (parentId: string): string[] => {
        const kids = list.filter(c => c.parent_id === parentId)
        return kids.flatMap(k => [k.name, ...getChildrenNames(k.id)])
      }
      return [catObj.name, ...getChildrenNames(catObj.id)]
    }
  }, [categories])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const storedStaff = sessionStorage.getItem(`unicon_staff_session_${slug}`)
    if (storedStaff) {
      try {
        const parsed = JSON.parse(storedStaff)
        setAuthenticatedStaff(parsed)
        setShowSecurityGate(false)
      } catch (e) {
        // invalid JSON
      }
    }
  }, [slug])

  // Beacon unload cleanup listener so closing tab or exiting releases session instantly
  useEffect(() => {
    const handleBeforeUnload = () => {
      const storedStaff = sessionStorage.getItem(`unicon_staff_session_${slug}`)
      if (storedStaff && business?.id) {
        try {
          const parsed = JSON.parse(storedStaff)
          if (parsed?.id) {
            const beaconData = JSON.stringify({ businessId: business.id, staffId: parsed.id })
            navigator.sendBeacon('/api/auth/session-release', beaconData)
          }
        } catch (e) {
          // ignore
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [slug, business?.id])

  const saveFavoritesPermanently = async (newFavs: any[]) => {
    setFavorites(newFavs)
    if (business?.id) {
      const favIds = newFavs.map(f => f.id)
      await supabase
        .from('businesses')
        .update({ pos_favorites: favIds })
        .eq('id', business.id)
    }
  }

  useEffect(() => {
    if (serviceType === 'DELIVERY' && deliveryCharges === 0) {
      setDeliveryCharges(150)
    } else if (serviceType !== 'DELIVERY') {
      setDeliveryCharges(0)
    }
  }, [serviceType])

  // CRM phone lookup with unconditional default address population
  useEffect(() => {
    const cleanPhone = customerPhone.replace(/\D/g, '')
    if (cleanPhone.length < 7 || !slug) {
      setCrmStatus('idle')
      return
    }

    const timer = setTimeout(async () => {
      setCrmStatus('searching')
      try {
        const res = await fetch(`/api/crm/lookup?slug=${encodeURIComponent(slug)}&phone=${encodeURIComponent(customerPhone.trim())}`)
        const json = await res.json()

        if (json.found && json.customer) {
          const match = json.customer
          if (match.name) {
            setCustomerName(match.name)
          }
          const savedAddr = match.default_address || match.address
          if (savedAddr) {
            setDeliveryAddress(savedAddr)
          }
          setCrmStatus('found')
        } else {
          if (cleanPhone.length >= 9) {
            setCrmStatus('new')
          } else {
            setCrmStatus('idle')
          }
        }
      } catch (err) {
        console.error('CRM lookup fetch fail:', err)
        setCrmStatus('new')
      }
    }, 450)

    return () => clearTimeout(timer)
  }, [customerPhone, slug])

  const handleTableSelect = async (t: any) => {
    setSelectedTable(t)
    if (business?.id) {
      const { data: latestBiz } = await supabase
        .from('businesses')
        .select('next_order_seq, next_serial_seq, next_kot_seq')
        .eq('id', business.id)
        .single()
      
      if (latestBiz) {
        setBusiness((prev: any) => ({
          ...prev,
          next_order_seq: latestBiz.next_order_seq,
          next_serial_seq: latestBiz.next_serial_seq,
          next_kot_seq: latestBiz.next_kot_seq
        }))
      }
    }
  }

  useEffect(() => {
    async function fetchTenantData() {
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

      // Dynamically set browser tab title to "POS - [Tenant Name]"
      if (biz.name) {
        document.title = `POS - ${biz.name}`
      }

      const tenantProfile = getBusinessProfile(biz.business_type)
      setProfile(tenantProfile)

      // Fetching from staff_profiles table with robust filtering for waiters
      const { data: staffList, error: staffErr } = await supabase
        .from('staff_profiles')
        .select('id, full_name, role, department')
        .eq('business_id', biz.id)

      if (staffList && !staffErr) {
        const filteredWaiters = staffList.filter((s: any) => {
          const r = (s.role || '').toLowerCase()
          const d = (s.department || '').toLowerCase()
          return r.includes('waiter') || r.includes('waitstaff') || d.includes('service') || d.includes('waiter')
        })
        setWaiters(filteredWaiters)
      } else {
        console.warn('Failed to load staff profiles:', staffErr)
      }

      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .eq('business_id', biz.id)
        .order('sort_order', { ascending: true })
      if (catData) setCategories(catData)

      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', biz.id)
        .order('sort_order', { ascending: true })

      if (productData && productData.length > 0) {
        setProducts(productData)
        const addons = productData.filter((p: any) => p.category?.toUpperCase() === 'ADD ONS' || p.category?.toUpperCase() === 'ADD-ONS')
        setAddOnsProducts(addons)

        // Load permanent favorites from database column `pos_favorites`
        if (biz.pos_favorites && Array.isArray(biz.pos_favorites) && biz.pos_favorites.length > 0) {
          const mappedFavs = biz.pos_favorites.map((id: string) => productData.find((p: any) => p.id === id)).filter(Boolean)
          setFavorites(mappedFavs)
        } else {
          setFavorites(productData.slice(0, 6))
        }
      }

      if (tenantProfile.modules.hasTables) {
        const { data: tableData } = await supabase
          .from('tables')
          .select('*')
          .eq('business_id', biz.id)
          .order('sort_order', { ascending: true })

        if (tableData && tableData.length > 0) {
          setTables(tableData)
          
          let orderedZones: string[] = []
          if (biz.zone_arrangement && Array.isArray(biz.zone_arrangement) && biz.zone_arrangement.length > 0) {
            const fetchedZones = Array.from(new Set(tableData.map((t: any) => t.zone || t.zone_name || 'MAIN HALL'))) as string[]
            const savedArrangement = biz.zone_arrangement.filter((z: string) => fetchedZones.includes(z))
            const missingZones = fetchedZones.filter((z: string) => !savedArrangement.includes(z))
            orderedZones = [...savedArrangement, ...missingZones]
            setZones(orderedZones)
          } else {
            orderedZones = Array.from(new Set(tableData.map((t: any) => t.zone || t.zone_name || 'MAIN HALL'))) as string[]
            setZones(orderedZones)
          }

          // Select the very first table in the very first primary zone by sequence
          const firstZoneName = orderedZones[0]
          const firstZoneTables = tableData
            .filter(t => (t.zone || t.zone_name || 'MAIN HALL') === firstZoneName)
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || (a.name || a.table_number || '').localeCompare(b.name || b.table_number || ''))

          if (firstZoneTables.length > 0) {
            setSelectedTable(firstZoneTables[0])
          } else {
            setSelectedTable(tableData[0])
          }
        }

        const { data: resData } = await supabase
          .from('reservations')
          .select('*')
          .eq('business_id', biz.id)
          .eq('status', 'RESERVED')

        if (resData) {
          setReservations(resData)
        }
      }

      setLoading(false)
    }

    fetchTenantData()
  }, [slug, router])

  // REAL-TIME WEBSOCKET SUBSCRIPTION FOR LIVE SYNC ACROSS POS TERMINAL
  useEffect(() => {
    if (!business?.id) return

    const channel = supabase
      .channel(`pos-terminal-live-sync-${business.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tables',
          filter: `business_id=eq.${business.id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updatedTable = payload.new
            setTables(prev => prev.map(t => t.id === updatedTable.id ? { ...t, ...updatedTable } : t))
            setSelectedTable(curr => curr?.id === updatedTable.id ? { ...curr, ...updatedTable } : curr)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `business_id=eq.${business.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setProducts(prev => [...prev, payload.new])
          } else if (payload.eventType === 'UPDATE') {
            const updatedProd = payload.new
            setProducts(prev => prev.map(p => p.id === updatedProd.id ? { ...p, ...updatedProd } : p))
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id
            setProducts(prev => prev.filter(p => p.id !== deletedId))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'businesses',
          filter: `id=eq.${business.id}`,
        },
        (payload) => {
          setBusiness(payload.new)
          if (payload.new?.name) {
            document.title = `POS - ${payload.new.name}`
          }
          if (payload.new?.pos_favorites && Array.isArray(payload.new.pos_favorites)) {
            const mappedFavs = payload.new.pos_favorites.map((id: string) => products.find((p: any) => p.id === id)).filter(Boolean)
            if (mappedFavs.length > 0) setFavorites(mappedFavs)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [business?.id, products])

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
        setReservations(prev => prev.filter(r => r.id !== res.id))
      }
    })
  }, [currentTime, reservations, business])

  const getDealItemsSummary = (item: any) => {
    if (!item.is_deal || !item.deal_items) return null
    try {
      const parsedItems = typeof item.deal_items === 'string' ? JSON.parse(item.deal_items) : item.deal_items
      if (!Array.isArray(parsedItems) || parsedItems.length === 0) return null

      return parsedItems.map((di: any) => {
        const foundProd = products.find((p: any) => p.id === di.itemId)
        const name = foundProd ? foundProd.name : 'Item'
        return `${di.qty || 1}x ${name}`
      })
    } catch {
      return null
    }
  }

  const getOrderedFilteredProducts = () => {
    const list = products || []
    const searchedProducts = list.filter(p => {
      return (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
             (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
    })

    if (selectedMotherCategoryFilter === 'ALL') {
      const orderedList: any[] = []
      const processedIds = new Set()

      flattenedCategories.forEach(cat => {
        const catProducts = searchedProducts
          .filter(p => {
            const primary = p.category || 'GENERAL'
            const linked = p.linked_categories || []
            return [primary, ...linked].includes(cat.name) && !processedIds.has(p.id)
          })
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

        catProducts.forEach(cp => {
          processedIds.add(cp.id)
          orderedList.push(cp)
        })
      })

      searchedProducts
        .filter(p => !processedIds.has(p.id))
        .sort((a, b) => ((a.sort_order ?? 0) - (b.sort_order ?? 0)) || (a.name || '').localeCompare(b.name || ''))
        .forEach(cp => {
          processedIds.add(cp.id)
          orderedList.push(cp)
        })

      return orderedList
    }

    if (selectedSubCategoryFilter) {
      return searchedProducts
        .filter(p => {
          const primaryCat = p.category || 'GENERAL'
          const linkedCats = p.linked_categories || []
          return [primaryCat, ...linkedCats].includes(selectedSubCategoryFilter)
        })
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    } else {
      const targetCategoryNames = getDescendantNames(selectedMotherCategoryFilter)
      return searchedProducts
        .filter(p => {
          const primaryCat = p.category || 'GENERAL'
          const linkedCats = p.linked_categories || []
          const combined = [primaryCat, ...linkedCats]
          return combined.some(c => targetCategoryNames.includes(c))
        })
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    }
  }

  const filteredProducts = getOrderedFilteredProducts()
  const currencySymbol = business?.currency_symbol || 'Rs.'

  if (loading || !profile) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center font-bold text-gray-700">Loading Adaptive POS Terminal...</div>
  }

  const effectiveModules = {
    hasPOS: business?.has_pos ?? profile.modules.hasPOS,
    hasKDS: business?.has_kds ?? profile.modules.hasKDS,
    hasERP: business?.has_erp ?? true,
    hasDispatchQueue: business?.has_dispatch_queue ?? business?.has_dispatch ?? profile.modules.hasDispatchQueue ?? false
  }

  const activeTableReservation = reservations.find(r => r.table_id === selectedTable?.id && r.status === 'RESERVED')
  const isTableLockedByReservation = selectedTable?.status === 'reserved' && activeTableReservation

  const updateCurrentCart = async (newCart: any[]) => {
    if (profile.modules.hasTables && serviceType === 'DINE-IN' && selectedTable) {
      if (isTableLockedByReservation) {
        alert('Cannot take orders on a reserved table until the customer arrives and the table is marked as Attended.')
        return
      }

      const isNowOccupied = newCart.length > 0
      const newStatus = isNowOccupied ? 'occupied' : 'available'

      setTableCarts({
        ...tableCarts,
        [selectedTable.id]: newCart
      })

      if (!isNowOccupied) {
        setTableOrderNumbers(prev => {
          const copy = { ...prev }
          delete copy[selectedTable.id]
          return copy
        })
      }

      if (selectedTable.status !== newStatus) {
        await supabase
          .from('tables')
          .update({ status: newStatus })
          .eq('id', selectedTable.id)

        setTables(tables.map(t => t.id === selectedTable.id ? { ...t, status: newStatus } : t))
        setSelectedTable({ ...selectedTable, status: newStatus })
      }
    } else {
      setGeneralCart(newCart)
      if (newCart.length === 0) {
        setGeneralOrderNumber(null)
      }
    }
  }

  const handleClearCartAndCustomer = () => {
    updateCurrentCart([])
    setCustomerName('Walk-In Customer')
    setCustomerPhone('')
    setDeliveryAddress('')
    setDeliveryNote('')
    setCrmStatus('idle')
    setSelectedWaiter(null)
    setWaiterSearchInput('')
  }

  const syncCustomerProfile = async () => {
    if (!business?.id || !customerPhone.trim()) return null
    const cleanName = customerName.trim() || 'Walk-In Customer'
    const cleanPhone = customerPhone.trim()

    const { data } = await supabase
      .from('customers')
      .upsert({
        business_id: business.id,
        name: cleanName,
        phone: cleanPhone,
        default_address: deliveryAddress.trim() || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'business_id,phone'
      })
      .select()
      .single()

    return data
  }

  const handleSaveNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!business?.id || !customerPhone.trim() || !newCustNameInput.trim()) {
      alert('Phone number and customer name are required.')
      return
    }

    setSavingNewCustomer(true)
    try {
      const { data, error } = await supabase
        .from('customers')
        .upsert({
          business_id: business.id,
          name: newCustNameInput.trim(),
          phone: customerPhone.trim(),
          email: newCustEmailInput.trim() || null,
          default_address: newCustAddressInput.trim() || deliveryAddress.trim() || null,
          loyalty_points: 0,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'business_id,phone'
        })
        .select()
        .single()

      if (error) {
        alert(`Failed to save customer: ${error.message}`)
      } else if (data) {
        setCustomerName(data.name)
        if (data.default_address) {
          setDeliveryAddress(data.default_address)
        }
        setCrmStatus('found')
        setShowNewCustomerModal(false)
        setNewCustNameInput('')
        setNewCustEmailInput('')
        setNewCustAddressInput('')
      }
    } catch (err: any) {
      alert(`Error saving customer: ${err.message || err}`)
    } finally {
      setSavingNewCustomer(false)
    }
  }

  const validateDeliveryRequirement = () => {
    if (serviceType === 'DELIVERY') {
      const cName = customerName.trim()
      const cPhone = customerPhone.trim()
      const cAddr = deliveryAddress.trim()
      if (!cName || cName === 'Walk-In Customer' || !cPhone || !cAddr) {
        alert('Delivery orders strictly require valid Customer Name, Phone Number, and Delivery Address.')
        return false
      }
    }
    return true
  }

  const handleProductClick = (item: any) => {
    if (item.in_stock === false) return
    if (isTableLockedByReservation) {
      alert('This table is currently reserved. Please click "Attended" on the table tile on the left sidebar once the customer arrives before taking orders.')
      return
    }

    const hasVariants = item.variants && item.variants.length > 0
    // FIXED: Safely evaluate variants and modifiers independently of KDS module state or undefined structures
    const hasModifiers = Boolean(item.has_modifiers) || (item.modifiers && item.modifiers.length > 0)

    if (hasVariants || hasModifiers) {
      setCustomizingItem(item)
      setSelectedVariant(hasVariants ? item.variants[0] : null)
      setSelectedAddons([])
      setAddonVariants({})
      setShowCustomizeModal(true)
    } else {
      let resolvedDealComponents = []
      if (item.is_deal && item.deal_items) {
        try {
          const parsed = typeof item.deal_items === 'string' ? JSON.parse(item.deal_items) : item.deal_items
          if (Array.isArray(parsed)) {
            resolvedDealComponents = parsed.map((di: any) => {
              const found = products.find((p: any) => p.id === di.itemId)
              return {
                qty: di.qty || 1,
                name: found ? found.name : 'Item'
              }
            })
          }
        } catch {
          // ignore
        }
      }

      addItemToActiveCart({ 
        ...item, 
        qty: 1, 
        selectedVariant: null, 
        selectedAddons: [], 
        finalUnitPrice: item.price,
        dealComponents: resolvedDealComponents,
        sentToKitchen: false
      })
    }
  }

  const addItemToActiveCart = (newItem: any) => {
    const cartKey = `${newItem.id}-${newItem.selectedVariant ? newItem.selectedVariant.name : 'base'}-${(newItem.selectedAddons || []).map((a: any) => a.id).sort().join('-')}`
    const existingIndex = currentCart.findIndex((ci: any) => ci.cartKey === cartKey)

    let updatedCart = [...currentCart]
    if (existingIndex > -1) {
      updatedCart[existingIndex].qty += 1
    } else {
      updatedCart.push({ ...newItem, cartKey })
    }

    updateCurrentCart(updatedCart)
  }

  const handleAddCustomizedToCart = () => {
    if (!customizingItem) return

    const variantPrice = selectedVariant?.price || 0
    const addonsTotal = selectedAddons.reduce((acc, a) => {
      const chosenVar = addonVariants[a.id]
      const varPrice = chosenVar ? (chosenVar.price || 0) : 0
      return acc + (a.price || 0) + varPrice
    }, 0)

    const finalUnitPrice = customizingItem.price + variantPrice + addonsTotal

    const formattedAddons = selectedAddons.map(a => ({
      ...a,
      selectedVariant: addonVariants[a.id] || null
    }))

    let resolvedDealComponents = []
    if (customizingItem.is_deal && customizingItem.deal_items) {
      try {
        const parsed = typeof customizingItem.deal_items === 'string' ? JSON.parse(customizingItem.deal_items) : customizingItem.deal_items
        if (Array.isArray(parsed)) {
          resolvedDealComponents = parsed.map((di: any) => {
            const found = products.find((p: any) => p.id === di.itemId)
            return {
              qty: di.qty || 1,
              name: found ? found.name : 'Item'
            }
          })
        }
      } catch {
        // ignore
      }
    }

    addItemToActiveCart({
      ...customizingItem,
      qty: 1,
      selectedVariant,
      selectedAddons: formattedAddons,
      finalUnitPrice,
      dealComponents: resolvedDealComponents,
      sentToKitchen: false
    })

    setShowCustomizeModal(false)
    setCustomizingItem(null)
    setSelectedVariant(null)
    setSelectedAddons([])
    setAddonVariants({})
  }

  const handleTileMarkAttended = async (tableId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const res = reservations.find(r => r.table_id === tableId && r.status === 'RESERVED')
    if (res) {
      await supabase.from('reservations').update({ status: 'ATTENDED' }).eq('id', res.id)
    }

    await supabase.from('tables').update({ status: 'occupied' }).eq('id', tableId)

    setTables(tables.map(t => t.id === tableId ? { ...t, status: 'occupied' } : t))
    setReservations(reservations.filter(r => r.id !== res?.id))

    if (selectedTable?.id === tableId) {
      setSelectedTable({ ...selectedTable, status: 'occupied' })
    }
  }

  const triggerPrintKot = (kotPayload: any) => {
    setPrintOrderData(null)
    setPrintKotData(kotPayload)
    setTimeout(() => {
      if (printKotRef.current) {
        window.print()
      }
    }, 150)
  }

  const triggerPrintReceipt = (receiptPayload: any) => {
    setPrintKotData(null)
    setPrintOrderData(receiptPayload)
    setTimeout(() => {
      if (printReceiptRef.current) {
        window.print()
      }
    }, 150)
  }

  const triggerPrintSrr = (srrPayload: any) => {
    setPrintKotData(null)
    setPrintOrderData(null)
    setPrintSrrData(srrPayload)
    setTimeout(() => {
      if (printSrrRef.current) {
        window.print()
      }
    }, 150)
  }

  const handleOpenRecallView = async () => {
    if (!business?.id) return
    setLoadingRecall(true)
    setIsRecallViewActive(true)

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error && data) {
      setRecentOrders(data)
    } else {
      setRecentOrders([])
    }
    setLoadingRecall(false)
  }

  const handleReprintOrder = (orderRecord: any) => {
    const receiptPayload = {
      storeName: business?.name || 'STORE',
      address: business?.address || '',
      phone: business?.phone || '',
      orderNo: orderRecord.order_number ? `KB-${String(orderRecord.order_number).padStart(6, '0')}` : (orderRecord.serial_number || orderRecord.id?.slice(0, 8) || 'SAVED'),
      serial_number: orderRecord.serial_number || `SN-${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date(orderRecord.created_at || Date.now()).toLocaleString(),
      staff: authenticatedStaff?.full_name || 'Staff',
      waiter: orderRecord.waiter_name || null,
      customerName: orderRecord.customer_name || 'Walk-In Customer',
      customerPhone: orderRecord.customer_phone || '',
      deliveryAddress: orderRecord.delivery_address || '',
      deliveryNote: orderRecord.delivery_note || '',
      serviceType: orderRecord.service_type || 'COUNTER',
      items: orderRecord.items || [],
      subtotal: orderRecord.subtotal || orderRecord.total_amount,
      serviceCharges: orderRecord.service_charges || 0,
      discountAmount: orderRecord.discount_amount || 0,
      deliveryCharges: orderRecord.delivery_charges || 0,
      calculatedTax: orderRecord.gst_amount || 0,
      grandTotal: orderRecord.total_amount || 0,
      primaryPaymentMethod: orderRecord.payment_method || 'CASH',
      cash_received: orderRecord.total_amount || 0,
      change_returned: orderRecord.change_returned || 0,
      fbrPosId: orderRecord.fbr_pos_id || null
    }

    triggerPrintReceipt(receiptPayload)
  }

  // Initiate Refund Workflow with Quantity Tracking
  const handleOpenRefundModal = (orderRecord: any) => {
    setSelectedOrderForRefund(orderRecord)
    setRefundManagerPin('')
    setRefundManagerQrToken('')
    setRefundReasonCode('Quality Issue / Damaged')
    
    const initialSelection: { [idx: number]: { returnQty: number, maxQty: number } } = {}
    if (orderRecord.items && Array.isArray(orderRecord.items)) {
      orderRecord.items.forEach((item: any, idx: number) => {
        const totalQty = item.qty || item.quantity || 1
        const alreadyRefunded = item.refunded_qty || 0
        const availableMax = Math.max(0, totalQty - alreadyRefunded)
        initialSelection[idx] = { returnQty: 0, maxQty: availableMax }
      })
    }
    setRefundItemsSelection(initialSelection)
    setShowRefundAuthModal(true)
  }

  // Core Refund Execution Function (Shared between PIN and Instant QR Scan)
  const executeRefundTransaction = async (staffMatch: any) => {
    if (!business?.id || !selectedOrderForRefund) return

    setProcessingRefund(true)
    try {
      let totalRefundAmount = 0
      const returnedItemsList: any[] = []
      const updatedOrderItems = [...(selectedOrderForRefund.items || [])]

      Object.entries(refundItemsSelection).forEach(([idxStr, sel]) => {
        const idx = Number(idxStr)
        if (sel.returnQty > 0) {
          const origItem = updatedOrderItems[idx]
          const itemPrice = origItem.finalUnitPrice || origItem.price || 0
          totalRefundAmount += itemPrice * sel.returnQty

          const prevRefunded = origItem.refunded_qty || 0
          origItem.refunded_qty = prevRefunded + sel.returnQty

          returnedItemsList.push({
            ...origItem,
            qty: sel.returnQty
          })
        }
      })

      if (totalRefundAmount <= 0) {
        alert('Please select at least one item quantity to refund.')
        setProcessingRefund(false)
        return
      }

      // 1. Insert into order_refunds audit log table
      const { error: refundErr } = await supabase.from('order_refunds').insert({
        business_id: business.id,
        original_order_id: selectedOrderForRefund.id,
        order_number: selectedOrderForRefund.order_number,
        refund_amount: totalRefundAmount,
        refund_reason: refundReasonCode,
        returned_items: returnedItemsList,
        authorized_by_staff_id: staffMatch.id,
        authorized_by_name: staffMatch.full_name,
        created_at: new Date().toISOString()
      })

      if (refundErr) {
        console.warn('Order refunds table note:', refundErr.message)
      }

      // 2. Update original order in Supabase
      const newTotalAmount = Math.max(0, (selectedOrderForRefund.total_amount || 0) - totalRefundAmount)
      const allItemsFullyRefunded = updatedOrderItems.every(i => (i.refunded_qty || 0) >= (i.qty || i.quantity || 1))

      await supabase.from('orders').update({
        items: updatedOrderItems,
        total_amount: newTotalAmount,
        fiscal_status: allItemsFullyRefunded ? 'fully_refunded' : 'partially_refunded'
      }).eq('id', selectedOrderForRefund.id)

      // 3. Generate Sales Return Receipt (SRR) Payload
      const srrNumber = `SRR-${Math.floor(100000 + Math.random() * 900000)}`
      const srrPayload = {
        storeName: business?.name || 'STORE',
        address: business?.address || '',
        phone: business?.phone || '',
        srrNo: srrNumber,
        originalOrderNo: selectedOrderForRefund.order_number ? `KB-${String(selectedOrderForRefund.order_number).padStart(6, '0')}` : 'N/A',
        serialNumber: selectedOrderForRefund.serial_number || 'N/A',
        date: new Date().toLocaleString(),
        authorizedManager: staffMatch.full_name,
        serviceType: selectedOrderForRefund.service_type || 'COUNTER',
        paymentMode: selectedOrderForRefund.payment_method || 'CASH',
        refundReason: refundReasonCode,
        returnedItems: returnedItemsList,
        totalRefundAmount
      }

      triggerPrintSrr(srrPayload)

      alert(`Successfully processed refund of ${currencySymbol} ${totalRefundAmount} authorized by ${staffMatch.full_name}! Sales Return Receipt printed.`)
      setShowRefundAuthModal(false)
      setSelectedOrderForRefund(null)
      handleOpenRecallView()
    } catch (err: any) {
      alert(`Refund error: ${err.message || err}`)
    } finally {
      setProcessingRefund(false)
    }
  }

  // Execute Secure Refund Processing via Manual PIN
  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!business?.id || !selectedOrderForRefund) return
    if (!refundManagerPin.trim()) {
      alert('Manager Security PIN is mandatory to authorize a refund.')
      return
    }

    const { data: staffMatch, error: staffErr } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('business_id', business.id)
      .eq('pin_code', refundManagerPin.trim())
      .single()

    if (staffErr || !staffMatch) {
      alert('Invalid Manager PIN. Refund authorization denied.')
      return
    }

    await executeRefundTransaction(staffMatch)
  }

  // Instant QR Badge Scan Authorization Handler
  const handleManagerQrScan = async (scannedToken: string) => {
    const cleanToken = scannedToken.trim()
    if (!cleanToken || !business?.id || !selectedOrderForRefund) return

    const { data: staffMatch, error: staffErr } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('business_id', business.id)
      .eq('qr_token', cleanToken)
      .single()

    if (!staffErr && staffMatch) {
      // Valid manager badge detected -> Instant Authorization & Processing!
      await executeRefundTransaction(staffMatch)
    }
  }

  const handleSendToKitchen = async () => {
    if (currentCart.length === 0) return
    if (!validateDeliveryRequirement()) return

    await syncCustomerProfile()

    const unsentItems = currentCart.filter(item => !item.sentToKitchen)
    if (unsentItems.length === 0) {
      alert('No new items added to this order since the last KOT was sent.')
      return
    }

    if (profile.modules.hasTables && serviceType === 'DINE-IN' && selectedTable) {
      await supabase
        .from('tables')
        .update({ status: 'occupied' })
        .eq('id', selectedTable.id)

      setTables(tables.map(t => t.id === selectedTable.id ? { ...t, status: 'occupied' } : t))
      setSelectedTable({ ...selectedTable, status: 'occupied' })
    }

    const baseKotSeq = Number(business?.next_kot_seq ?? 100000)
    const kotNoStr = `KOT-${String(baseKotSeq).padStart(6, '0')}`
    const waiterNameStr = selectedWaiter ? (selectedWaiter.full_name || selectedWaiter.name) : 'N/A'

    const kotPayload = {
      kotNo: kotNoStr,
      orderNumber: activeOrderNumber,
      time: new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
      staff: authenticatedStaff?.full_name || 'Sheraz Aftab',
      waiter: waiterNameStr,
      customerName,
      customerPhone,
      deliveryAddress,
      deliveryNote,
      serviceType,
      tableName: (serviceType === 'DINE-IN' && selectedTable) ? (selectedTable.name || selectedTable.table_number) : null,
      zoneName: (serviceType === 'DINE-IN' && selectedTable) ? (selectedTable.zone || selectedTable.zone_name) : null,
      items: unsentItems
    }

    // Respect KDS Module toggle status for digital database routing
    if (effectiveModules.hasKDS) {
      try {
        const nextKot = baseKotSeq + 1
        await supabase.from('businesses').update({ next_kot_seq: nextKot }).eq('id', business.id)
        setBusiness((prev: any) => ({ ...prev, next_kot_seq: nextKot }))

        await supabase.from('kds_tickets').insert({
          business_id: business.id,
          kot_no: kotNoStr,
          service_type: serviceType,
          table_name: (serviceType === 'DINE-IN' && selectedTable) ? (selectedTable.name || selectedTable.table_number) : null,
          customer_name: customerName,
          waiter_name: waiterNameStr,
          items: unsentItems,
          status: 'pending',
          created_at: new Date().toISOString()
        })
      } catch (kdsErr) {
        console.warn('Live KDS table sync note:', kdsErr)
      }
    }

    const updatedCart = currentCart.map(item => ({ ...item, sentToKitchen: true }))
    updateCurrentCart(updatedCart)

    triggerPrintKot(kotPayload)
  }

  const handleSendToDispatch = async () => {
    if (currentCart.length === 0) return
    if (!validateDeliveryRequirement()) return

    await syncCustomerProfile()
    alert(`Order added to Fulfillment / Dispatch Queue for ${customerName} (${serviceType})!`)
    handleClearCartAndCustomer()
  }

  const subtotal = Math.max(0, currentCart.reduce((acc, item) => acc + (item.finalUnitPrice * item.qty), 0))
  const taxableAmount = Math.max(0, subtotal + serviceCharges - discountAmount + deliveryCharges)
  const businessGstRate = Number(business?.gst_rate ?? (business?.tax_enabled !== false ? (business?.tax_rate ?? 16) : 0))
  const calculatedTax = Math.round(taxableAmount * (businessGstRate / 100))
  const grandTotal = Math.max(0, taxableAmount + calculatedTax)

  const isFbrSyncActive = Boolean(
    (business?.enable_fbr_integration === true || business?.enable_fbr_integration === 'true' || business?.fbr_integration_enabled === true || business?.fbr_integration_enabled === 'true') && 
    (business?.fbr_pos_id && String(business.fbr_pos_id).trim() !== '')
  )

  const numericCustomReceived = parseFloat(customReceivedCash) || 0
  const activeReceivedCash = singleReceivedCash === -1 ? numericCustomReceived : singleReceivedCash
  const changeReturned = singleMethod === 'CASH' && activeReceivedCash > grandTotal ? activeReceivedCash - grandTotal : 0

  const openSettlementModal = () => {
    if (currentCart.length === 0) return
    if (!validateDeliveryRequirement()) return
    setTenderSplits([
      { method: serviceType === 'DELIVERY' ? 'CASH ON DELIVERY' : 'CASH', amount: grandTotal },
      { method: 'CARD', amount: 0 }
    ])
    setSingleReceivedCash(grandTotal)
    setCustomReceivedCash('')
    setShowSettlementModal(true)
  }

  const finalizePayment = async () => {
    if (currentCart.length === 0) {
      alert('Cannot settle an empty cart.')
      return
    }
    if (!validateDeliveryRequirement()) return

    if (!business?.id) {
      console.error('Business object missing id:', business)
      alert('Business ID not loaded yet.')
      return
    }

    const unsentItems = currentCart.filter(item => !item.sentToKitchen)
    let kotPayloadToPrint = null

    if (unsentItems.length > 0) {
      const baseKotSeq = Number(business?.next_kot_seq ?? 100000)
      const kotNoStr = `KOT-${String(baseKotSeq).padStart(6, '0')}`
      const waiterNameStr = selectedWaiter ? (selectedWaiter.full_name || selectedWaiter.name) : 'N/A'

      kotPayloadToPrint = {
        kotNo: kotNoStr,
        orderNumber: activeOrderNumber,
        time: new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
        staff: authenticatedStaff?.full_name || 'Staff',
        waiter: waiterNameStr,
        customerName,
        customerPhone,
        deliveryAddress,
        deliveryNote,
        serviceType,
        tableName: (serviceType === 'DINE-IN' && selectedTable) ? (selectedTable.name || selectedTable.table_number) : null,
        zoneName: (serviceType === 'DINE-IN' && selectedTable) ? (selectedTable.zone || selectedTable.zone_name) : null,
        items: unsentItems
      }

      // Respect KDS Module toggle status for digital KOT ticket generation
      if (effectiveModules.hasKDS) {
        try {
          const nextKot = baseKotSeq + 1
          await supabase.from('businesses').update({ next_kot_seq: nextKot }).eq('id', business.id)
          setBusiness((prev: any) => ({ ...prev, next_kot_seq: nextKot }))

          await supabase.from('kds_tickets').insert({
            business_id: business.id,
            kot_no: kotNoStr,
            service_type: serviceType,
            table_name: (serviceType === 'DINE-IN' && selectedTable) ? (selectedTable.name || selectedTable.table_number) : null,
            customer_name: customerName,
            waiter_name: waiterNameStr,
            items: unsentItems,
            status: 'pending',
            created_at: new Date().toISOString()
          })
        } catch (kdsErr) {
          console.warn('Auto KOT generation note:', kdsErr)
        }
      }
    }

    const { data: freshBiz, error: fetchErr } = await supabase
      .from('businesses')
      .select('next_order_seq, next_serial_seq, next_kot_seq')
      .eq('id', business.id)
      .single()

    if (fetchErr || !freshBiz) {
      alert('Error fetching live sequence from database.')
      return
    }

    const assignedOrderInt = Number(freshBiz.next_order_seq ?? 100000)
    const assignedOrderCode = `KB-${String(assignedOrderInt).padStart(6, '0')}`
    const baseSerialSeq = Number(freshBiz.next_serial_seq ?? 100000)
    const generatedSerial = `SN-${String(baseSerialSeq).padStart(6, '0')}`

    const cartSnapshot = [...currentCart]
    const subtotalSnapshot = subtotal
    const gstSnapshot = calculatedTax
    const deliverySnapshot = deliveryCharges
    const serviceSnapshot = serviceCharges
    const discountSnapshot = discountAmount
    const totalSnapshot = grandTotal
    const paymentMethodSnapshot = isSplitPayment 
      ? tenderSplits.map(t => `${t.method}(${t.amount})`).join(', ')
      : singleMethod

    const custNameSnapshot = customerName.trim() || 'Walk-In Customer'
    const custPhoneSnapshot = customerPhone.trim()
    const deliveryAddrSnapshot = deliveryAddress.trim()
    const deliveryNoteSnapshot = deliveryNote.trim()

    // Sync and update delivery address in customer record if present
    await syncCustomerProfile()
    if (serviceType === 'DELIVERY' && custPhoneSnapshot && deliveryAddrSnapshot) {
      await supabase
        .from('customers')
        .update({ default_address: deliveryAddrSnapshot, updated_at: new Date().toISOString() })
        .eq('business_id', business.id)
        .eq('phone', custPhoneSnapshot)
    }

    const tenderBreakdownList = isSplitPayment 
      ? tenderSplits.filter(t => t.amount > 0)
      : [{ method: singleMethod, amount: grandTotal, receivedCash: singleMethod === 'CASH' ? activeReceivedCash : grandTotal, changeReturned: singleMethod === 'CASH' ? changeReturned : 0 }]

    // SMART ROUTING: If KDS is disabled but Dispatch Queue is enabled for Delivery ONLY, insert straight into dispatch queue
    const shouldRouteToDispatch = !effectiveModules.hasKDS && effectiveModules.hasDispatchQueue && serviceType === 'DELIVERY'

    const orderPayload = {
      business_id: business.id,
      slug: slug,
      order_number: assignedOrderInt,
      items: cartSnapshot.map(i => ({ ...i, sentToKitchen: true })),
      subtotal: subtotalSnapshot,
      service_charges: serviceSnapshot,
      discount_amount: discountSnapshot,
      delivery_charges: deliverySnapshot,
      gst_amount: gstSnapshot,
      total_amount: totalSnapshot,
      service_type: serviceType,
      waiter_id: (serviceType === 'DINE-IN' && selectedWaiter) ? (selectedWaiter?.id || null) : null,
      waiter_name: (serviceType === 'DINE-IN' && selectedWaiter) ? (selectedWaiter?.full_name || selectedWaiter?.name || null) : null,
      customer_name: custNameSnapshot,
      customer_phone: custPhoneSnapshot,
      delivery_address: deliveryAddrSnapshot,
      delivery_note: deliveryNoteSnapshot,
      payment_method: paymentMethodSnapshot,
      tender_breakdown: tenderBreakdownList,
      change_returned: changeReturned,
      serial_number: generatedSerial,
      ...(shouldRouteToDispatch ? { dispatch_status: 'pending' } : {}),
      ...(isFbrSyncActive ? {
        fbr_pos_id: business.fbr_pos_id,
        fiscal_status: 'pending_fbr_sync'
      } : {
        fiscal_status: 'non_fiscal'
      })
    }

    const { data: insertedOrder, error: orderErr } = await supabase
      .from('orders')
      .insert(orderPayload)
      .select()
      .single()

    if (orderErr) {
      console.error('Detailed save error message:', orderErr.message)
      alert(`Error saving order: ${orderErr.message || JSON.stringify(orderErr)}`)
      return
    }

    try {
      const nextOrder = assignedOrderInt + 1
      const nextSerial = baseSerialSeq + 1
      await supabase.from('businesses').update({ next_order_seq: nextOrder, next_serial_seq: nextSerial }).eq('id', business.id)
      setBusiness((prev: any) => ({ ...prev, next_order_seq: nextOrder, next_serial_seq: nextSerial }))
    } catch (seqErr) {
      console.warn('Sequence increment note:', seqErr)
    }

    if (isFbrSyncActive && insertedOrder?.id) {
      try {
        await fetch('/api/fbr/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: insertedOrder.id, slug })
        })
      } catch (fbrErr) {
        console.warn('FBR background sync queued/offline:', fbrErr)
      }
    }

    if (profile.modules.hasTables && serviceType === 'DINE-IN' && selectedTable) {
      await supabase
        .from('tables')
        .update({ status: 'available' })
        .eq('id', selectedTable.id)

      setTables(tables.map(t => t.id === selectedTable.id ? { ...t, status: 'available' } : t))
      setSelectedTable({ ...selectedTable, status: 'available' })

      const updatedCarts = { ...tableCarts }
      delete updatedCarts[selectedTable.id]
      setTableCarts(updatedCarts)

      setTableOrderNumbers(prev => {
        const copy = { ...prev }
        delete copy[selectedTable.id]
        return copy
      })
    } else {
      setGeneralCart([])
      setGeneralOrderNumber(null)
    }

    const receiptPayload = {
      storeName: business?.name || 'KRUNCHY BITE',
      address: business?.address || '',
      phone: business?.phone || '',
      orderNo: assignedOrderCode,
      serial_number: generatedSerial,
      date: new Date().toLocaleString(),
      staff: authenticatedStaff?.full_name || 'Staff',
      waiter: (serviceType === 'DINE-IN' && selectedWaiter) ? (selectedWaiter?.full_name || selectedWaiter?.name || null) : null,
      customerName: custNameSnapshot,
      customerPhone: custPhoneSnapshot,
      deliveryAddress: deliveryAddrSnapshot,
      deliveryNote: deliveryNoteSnapshot,
      serviceType,
      items: cartSnapshot,
      subtotal: subtotalSnapshot,
      serviceCharges: serviceSnapshot,
      discountAmount: discountSnapshot,
      deliveryCharges: deliverySnapshot,
      calculatedTax: gstSnapshot,
      grandTotal: totalSnapshot,
      primaryPaymentMethod: paymentMethodSnapshot,
      cash_received: singleMethod === 'CASH' ? activeReceivedCash : totalSnapshot,
      change_returned: changeReturned,
      fbrPosId: isFbrSyncActive ? business.fbr_pos_id : null
    }

    setShowSettlementModal(false)

    if (kotPayloadToPrint) {
      setPrintKotData(kotPayloadToPrint)
      setPrintOrderData(null)
      setTimeout(() => {
        window.print()
        setTimeout(() => {
          setPrintKotData(null)
          setPrintOrderData(receiptPayload)
          setTimeout(() => {
            window.print()
          }, 200)
        }, 500)
      }, 150)
    } else {
      triggerPrintReceipt(receiptPayload)
    }

    handleClearCartAndCustomer()
    alert(`Order ${assignedOrderCode} settled successfully!`)
  }

  const handleLockSession = async () => {
    let targetBizId = business?.id;
    let targetStaffId = authenticatedStaff?.id;

    if (!targetBizId || !targetStaffId) {
      try {
        const stored = sessionStorage.getItem(`unicon_staff_session_${slug}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          targetStaffId = parsed.id;
          targetBizId = parsed.business_id || business?.id;
        }
      } catch (e) {
        // ignore
      }
    }

    if (targetBizId && targetStaffId) {
      try {
        await fetch('/api/auth/session-release', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: targetBizId, staffId: targetStaffId })
        })
      } catch (err) {
        console.warn('Session release network note:', err)
      }
    }

    sessionStorage.removeItem(`unicon_staff_session_${slug}`)
    setAuthenticatedStaff(null)
    setShowSecurityGate(true)
  }

  const handleWorkstationExit = async () => {
    if (authenticatedStaff?.role === 'Admin' || authenticatedStaff?.role === 'owner') {
      router.push(`/${slug}`)
    } else {
      await handleLockSession()
    }
  }

  const freeTablesCount = tables.filter(t => t.status !== 'occupied' && t.status !== 'reserved').length

  const handleDragStart = (idx: number) => {
    setDraggedFavIndex(idx)
  }

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (draggedFavIndex === null || draggedFavIndex === idx) return
    const reordered = [...favorites]
    const [movedItem] = reordered.splice(draggedFavIndex, 1)
    reordered.splice(idx, 0, movedItem)
    setDraggedFavIndex(idx)
    saveFavoritesPermanently(reordered)
  }

  const handleDragEnd = () => {
    setDraggedFavIndex(null)
  }

  const toggleProductFavorite = (prod: any) => {
    const exists = favorites.some(f => f.id === prod.id)
    if (exists) {
      saveFavoritesPermanently(favorites.filter(f => f.id !== prod.id))
    } else {
      saveFavoritesPermanently([...favorites, prod])
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 flex flex-col font-sans select-none overflow-hidden h-screen text-xs">
      
      {showSecurityGate && business && (
        <SecurityGateModal 
          businessId={business.id}
          requiredModule="pos"
          onAuthenticated={(staff) => {
            setAuthenticatedStaff(staff)
            sessionStorage.setItem(`unicon_staff_session_${slug}`, JSON.stringify({ ...staff, business_id: business.id }))
            setShowSecurityGate(false)
          }}
          onCancel={() => router.push(`/`)}
        />
      )}

      {/* HEADER BAR */}
      <header className="bg-slate-900 text-white border-b border-slate-800 px-6 py-4 flex justify-between items-center shrink-0 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-inner">
            {profile.modules.hasKDS ? '🍔' : '⚡'}
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wide uppercase text-white flex items-center space-x-1.5">
              <span>{business?.name || 'POS TERMINAL'}</span>
              <span className="text-gray-500">•</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${profile.badgeColor}`}>
                {profile.displayName}
              </span>
            </h1>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Tenant Slug: {slug}</p>
          </div>
        </div>

        <div className="hidden md:flex items-center space-x-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
          {effectiveModules.hasPOS && (authenticatedStaff?.access_pos !== false) && (
            <span className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold shadow-2xs">POS</span>
          )}
          {effectiveModules.hasKDS && authenticatedStaff?.access_kds && (
            <a href={`/${slug}/kds`} target="_blank" rel="noopener noreferrer" className="px-3 py-1 text-gray-300 hover:text-white rounded-lg text-[11px] font-bold transition">KDS</a>
          )}
          {effectiveModules.hasDispatchQueue && (
            <a href={`/${slug}/dispatch`} target="_blank" rel="noopener noreferrer" className="px-3 py-1 text-gray-300 hover:text-white rounded-lg text-[11px] font-bold transition">DISPATCH</a>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {profile.modules.hasTables && serviceType === 'DINE-IN' && selectedTable && (
            <div className="hidden xl:flex items-center space-x-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl">
              <span className="text-gray-400 font-semibold text-[10px]">ACTIVE TABLE</span>
              <div className="flex items-center space-x-1 font-mono font-extrabold text-white">
                <span>🪑 {selectedTable.name || selectedTable.table_number}</span>
                <span className="text-gray-500">|</span>
                <span className="text-[11px]">{selectedTable.zone || selectedTable.zone_name || 'Main'} ({selectedTable.seats || selectedTable.capacity || 4} Seats)</span>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-3 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            {!isRecallViewActive && (
              <button 
                onClick={handleOpenRecallView}
                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl transition text-[10px] font-bold flex items-center space-x-1 shadow-2xs cursor-pointer"
                title="Recall Invoice / Search & Reprint"
              >
                <span>📜</span>
                <span>Recall / Search</span>
              </button>
            )}
            <div className="text-right font-mono">
              <div className="text-xs font-black text-white">{currentTime.toLocaleTimeString('en-US', { hour12: false })}</div>
              <div className="text-[9px] text-emerald-400 uppercase font-bold">Staff: {authenticatedStaff?.full_name || 'Online'}</div>
            </div>
            <button 
              onClick={handleLockSession}
              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition text-[10px] font-bold cursor-pointer"
              title="Lock / Sign Out Staff"
            >
              🔒 Lock
            </button>
            <button 
              onClick={handleWorkstationExit}
              className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition shadow flex items-center space-x-1 text-[11px] font-bold cursor-pointer"
              title="Exit terminal session / Lock kiosk"
            >
              <span>🚪</span>
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN WORKSPACE OR FULL-SCREEN RECALL VIEW */}
      {isRecallViewActive ? (
        <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
          <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
            <div className="flex items-center space-x-2">
              <span className="text-base">📜</span>
              <h3 className="font-black text-sm uppercase tracking-wider">Invoice Recall, Audit & Refund Portal</h3>
            </div>
            <button 
              onClick={() => setIsRecallViewActive(false)}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
            >
              ← Back to POS Register
            </button>
          </div>

          <div className="p-4 bg-white border-b space-y-3 shrink-0 text-xs shadow-2xs">
            <div className="font-black text-slate-900 uppercase tracking-wide text-[11px] flex justify-between items-center">
              <span>🔍 Search & Filter Criteria</span>
              {(recallSearchOrderNo || recallSearchSerial || recallSearchCustName || recallSearchPhone || recallDateFrom || recallDateTo) && (
                <button 
                  onClick={() => {
                    setRecallSearchOrderNo('')
                    setRecallSearchSerial('')
                    setRecallSearchCustName('')
                    setRecallSearchPhone('')
                    setRecallDateFrom('')
                    setRecallDateTo('')
                  }}
                  className="text-[10px] text-rose-600 hover:underline font-bold cursor-pointer"
                >
                  Clear All Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Date From</label>
                <input 
                  type="date"
                  value={recallDateFrom}
                  onChange={e => setRecallDateFrom(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Date To</label>
                <input 
                  type="date"
                  value={recallDateTo}
                  onChange={e => setRecallDateTo(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Customer Name</label>
                <input 
                  type="text"
                  placeholder="Search name..."
                  value={recallSearchCustName}
                  onChange={e => setRecallSearchCustName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Mobile Number</label>
                <input 
                  type="text"
                  placeholder="Search phone..."
                  value={recallSearchPhone}
                  onChange={e => setRecallSearchPhone(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Order ID</label>
                <input 
                  type="text"
                  placeholder="ID..."
                  value={recallSearchOrderNo}
                  onChange={e => setRecallSearchOrderNo(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Serial</label>
                <input 
                  type="text"
                  placeholder="SN-..."
                  value={recallSearchSerial}
                  onChange={e => setRecallSearchSerial(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 font-mono uppercase"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto space-y-3">
            {loadingRecall ? (
              <div className="text-center py-20 text-gray-500 font-bold">Querying order archives from database...</div>
            ) : filteredRecallOrders.length > 0 ? (
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-gray-400 uppercase px-1">
                  Showing {filteredRecallOrders.length} matching invoice records (Audit, Reprint & Refund):
                </div>
                {filteredRecallOrders.map((ord: any) => (
                  <div key={ord.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-2xs hover:border-slate-900 transition">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-black text-slate-900 text-xs">{ord.order_number ? `KB-${String(ord.order_number).padStart(6, '0')}` : (ord.serial_number || `SN-${Math.floor(100000 + Math.random() * 900000)}`)}</span>
                        <span className="bg-slate-100 text-slate-700 text-[9px] font-bold px-2 py-0.5 rounded uppercase">{ord.service_type || 'COUNTER'}</span>
                        {ord.fiscal_status && (
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                            ord.fiscal_status.includes('refund') ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {ord.fiscal_status}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 font-medium">
                        Customer: <span className="text-gray-900 font-bold">{ord.customer_name || 'Walk-In'}</span> ({ord.customer_phone || 'No Phone'}) • {new Date(ord.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right font-mono">
                        <div className="text-sm font-black text-emerald-700">{currencySymbol} {ord.total_amount}</div>
                        <div className="text-[10px] text-gray-400 uppercase">{ord.payment_method || 'CASH'}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleReprintOrder(ord)}
                          className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-2xs transition flex items-center space-x-1 cursor-pointer"
                        >
                          <span>🖨️</span>
                          <span>Reprint</span>
                        </button>
                        <button
                          onClick={() => handleOpenRefundModal(ord)}
                          className="px-4 py-2 bg-rose-700 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-2xs transition flex items-center space-x-1 cursor-pointer"
                        >
                          <span>↩️</span>
                          <span>Refund / Return</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-gray-400 text-xs">No invoices found matching your search criteria.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
        
        {/* COLUMN 1: DINE-IN TABLES OR FAVORITE/FAST-MOVING ITEMS */}
        {profile.modules.hasTables && serviceType === 'DINE-IN' ? (
          <aside className="w-80 bg-white border-r border-gray-200 flex flex-col shrink-0 shadow-2xs">
            <div className="p-3 border-b border-gray-200 space-y-2">
              <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-xl text-[11px] font-bold">
                {(['DINE-IN', 'TAKEAWAY', 'DELIVERY'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setServiceType(type)
                      if (type !== 'DINE-IN') {
                        setSelectedTable(null)
                      }
                    }}
                    className={`py-1.5 rounded-lg transition uppercase cursor-pointer ${serviceType === type ? 'bg-slate-900 text-white shadow-2xs' : 'text-gray-600 hover:text-black'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div className="flex justify-between items-center text-[11px] pt-1">
                <span className="font-extrabold uppercase text-gray-600">🪑 DINE-IN TABLES</span>
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                  {freeTablesCount} Available
                </span>
              </div>

              <div className="flex items-center space-x-1 overflow-x-auto pb-1">
                <button 
                  onClick={() => setActiveZone('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition text-[10px] font-bold uppercase whitespace-nowrap cursor-pointer ${activeZone === 'ALL' ? 'bg-black text-white shadow-2xs' : 'bg-gray-100 text-gray-600 hover:text-black'}`}
                >
                  ALL
                </button>
                {zones.map(z => (
                  <button 
                    key={z}
                    onClick={() => setActiveZone(z)}
                    className={`px-3 py-1.5 rounded-lg transition truncate px-2 uppercase text-[10px] font-bold whitespace-nowrap cursor-pointer ${activeZone === z ? 'bg-black text-white shadow-2xs' : 'bg-gray-100 text-gray-600 hover:text-black'}`}
                  >
                    📍 {z}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 flex-1 overflow-y-auto space-y-4">
              {posGroupedZones.map(group => (
                <div key={group.zoneName} className="space-y-2">
                  {activeZone !== 'ALL' && (
                    <div className="flex justify-between items-center bg-gray-50 border-y border-gray-200 px-2.5 py-1.5 sticky top-0 z-10">
                      <span className="text-[10px] font-black uppercase text-gray-700">📍 Zone: {group.zoneName}</span>
                      <span className="text-[9px] font-mono font-bold bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                        {group.tables.length}
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {group.tables.map(t => {
                      const isSelected = selectedTable?.id === t.id
                      const isOccupied = t.status === 'occupied'
                      const isReserved = t.status === 'reserved'
                      const tableRes = reservations.find(r => r.table_id === t.id && r.status === 'RESERVED')

                      let timeLeftStr = ''
                      if (isReserved && tableRes) {
                        const diffMs = new Date(tableRes.end_time).getTime() - currentTime.getTime()
                        if (diffMs > 0) {
                          const mins = Math.floor(diffMs / 60000)
                          const secs = Math.floor((diffMs % 60000) / 1000)
                          timeLeftStr = `${mins}m ${secs}s`
                        } else {
                          timeLeftStr = 'Expiring...'
                        }
                      }

                      const statusText = isOccupied ? 'OCCUPIED' : isReserved ? 'RESERVED' : 'AVAILABLE'
                      const statusColor = isOccupied ? 'text-red-600 font-black' : isReserved ? 'text-amber-600 font-black' : 'text-emerald-600 font-bold'
                      const dotColor = isOccupied ? 'bg-red-500' : isReserved ? 'bg-amber-400' : 'bg-emerald-500'

                      return (
                        <div
                          key={t.id}
                          onClick={() => handleTableSelect(t)}
                          className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between h-24 relative cursor-pointer ${
                            isSelected 
                              ? 'bg-slate-50 border-slate-900 shadow-xs ring-1 ring-slate-900' 
                              : isOccupied 
                              ? 'bg-red-50/40 border-red-200 hover:border-red-300' 
                              : isReserved
                              ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                              : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="font-extrabold uppercase text-[9px] text-gray-500 truncate">{t.zone || t.zone_name || 'Table'}</span>
                            <span className={`w-2 h-2 rounded-full ${dotColor} ${isOccupied ? 'animate-ping' : ''}`}></span>
                          </div>
                          <div className="font-mono font-black text-sm text-gray-900">{t.name || t.table_number}</div>

                          {isReserved && timeLeftStr && (
                            <div className="text-[9px] font-mono font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded text-center">
                              ⏱️ {timeLeftStr} left
                            </div>
                          )}

                          <div className="flex justify-between items-center text-[10px] font-medium pt-0.5">
                            <span className="text-gray-500">{t.seats || t.capacity || 4} Seats</span>
                            <span className={`uppercase text-[9px] ${statusColor}`}>
                              {statusText}
                            </span>
                          </div>

                          {isReserved && (
                            <button
                              onClick={(e) => handleTileMarkAttended(t.id, e)}
                              className="w-full mt-1 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[9px] font-black uppercase tracking-wider shadow-2xs cursor-pointer"
                            >
                              ✓ Attended
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        ) : (serviceType === 'TAKEAWAY' || serviceType === 'DELIVERY') ? (
          <aside className="w-80 bg-white border-r border-gray-200 flex flex-col shrink-0 shadow-2xs">
            <div className="p-3 border-b border-gray-200 space-y-2">
              <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-xl text-[11px] font-bold">
                {(['DINE-IN', 'TAKEAWAY', 'DELIVERY'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setServiceType(type)
                      if (type !== 'DINE-IN') {
                        setSelectedTable(null)
                      }
                    }}
                    className={`py-1.5 rounded-lg transition uppercase cursor-pointer ${serviceType === type ? 'bg-slate-900 text-white shadow-2xs' : 'text-gray-600 hover:text-black'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <span className="font-extrabold uppercase text-gray-800 text-[11px] block">★ FAVORITE / FAST MOVING</span>
                <span className="text-[9px] text-gray-400">Drag & drop to rearrange permanently</span>
              </div>
              <button
                onClick={() => setIsFavoriteManagerOpen(!isFavoriteManagerOpen)}
                className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-bold cursor-pointer"
              >
                {isFavoriteManagerOpen ? 'Done' : 'Manage'}
              </button>
            </div>

            <div className="p-3 flex-1 overflow-y-auto space-y-2">
              {!isFavoriteManagerOpen ? (
                <div className="grid grid-cols-2 gap-2">
                  {favorites.length > 0 ? favorites.map((fav, idx) => (
                    <div
                      key={fav.id}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleProductClick(fav)}
                      className="bg-white border border-gray-200 rounded-xl p-2.5 flex flex-col justify-between h-36 cursor-grab active:cursor-grabbing hover:border-slate-900 transition shadow-2xs relative group"
                    >
                      <div className="w-full h-16 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center overflow-hidden p-1 shrink-0">
                        {fav.image_url ? (
                          <img src={fav.image_url} alt={fav.name} className="w-full h-full object-contain drop-shadow-sm" />
                        ) : (
                          <span className="text-lg">📦</span>
                        )}
                      </div>
                      <span className="font-bold text-gray-900 text-[11px] truncate mt-1">{fav.name}</span>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-mono text-emerald-700 font-extrabold">{currencySymbol} {fav.price}</span>
                        <span className="text-gray-400">⋮⋮</span>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-2 text-center py-10 text-gray-400 text-xs">
                      No favorites set. Click "Manage" above to pin items.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-gray-500 uppercase px-1">Toggle products to add/remove favorites:</div>
                  <input
                    type="text"
                    placeholder="Search product to pin..."
                    value={favSearchQuery}
                    onChange={(e) => setFavSearchQuery(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-slate-900 font-medium"
                  />
                  <div className="max-h-[50vh] overflow-y-auto space-y-1">
                    {products
                      .filter(p => p.name.toLowerCase().includes(favSearchQuery.toLowerCase()))
                      .map(p => {
                        const isFav = favorites.some(f => f.id === p.id)
                        return (
                          <div key={p.id} className="flex justify-between items-center p-2 rounded-lg bg-gray-50 border border-gray-200">
                            <span className="text-xs font-semibold truncate pr-2">{p.name}</span>
                            <button
                              onClick={() => toggleProductFavorite(p)}
                              className={`px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer ${isFav ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'}`}
                            >
                              {isFav ? 'Remove' : '+ Pin'}
                            </button>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          </aside>
        ) : null}

        {/* COLUMN 2: PRODUCT CATALOG */}
        <section className="flex-1 flex flex-col bg-gray-100 overflow-hidden">
          
          <div className="p-3 border-b border-gray-200 bg-white flex flex-col gap-2 shadow-2xs">
            <input 
              type="text" 
              placeholder={`Search ${profile.terminology.productsLabel.toLowerCase()}...`} 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs text-gray-900 focus:outline-none focus:border-emerald-600 font-medium" 
            />

            <div className="flex space-x-1.5 overflow-x-auto w-full pb-1 pt-1">
              <button
                key="ALL"
                onClick={() => { setSelectedMotherCategoryFilter('ALL'); setSelectedSubCategoryFilter(null); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap uppercase cursor-pointer ${
                  selectedMotherCategoryFilter === 'ALL' ? 'bg-slate-900 text-white shadow-2xs' : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                }`}
              >
                ALL ({products.length})
              </button>
              {motherCategories.map(mother => {
                const count = products.filter(p => {
                  const primary = p.category || 'GENERAL'
                  const linked = p.linked_categories || []
                  return [primary, ...linked].some(c => getDescendantNames(mother.name).includes(c))
                }).length

                return (
                  <button
                    key={mother.id}
                    onClick={() => { setSelectedMotherCategoryFilter(mother.name); setSelectedSubCategoryFilter(null); }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap uppercase cursor-pointer ${
                      selectedMotherCategoryFilter === mother.name ? 'bg-slate-900 text-white shadow-2xs' : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    📁 {mother.name} ({count})
                  </button>
                )
              })}
            </div>

            {selectedMotherCategoryFilter !== 'ALL' && activeSubcategories.length > 0 && (
              <div className="flex items-center space-x-2 pt-2 border-t border-gray-100 overflow-x-auto">
                <span className="text-[10px] font-bold uppercase text-gray-400 whitespace-nowrap">Subcategory Filter:</span>
                <button
                  onClick={() => setSelectedSubCategoryFilter(null)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                    selectedSubCategoryFilter === null ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  All in {selectedMotherCategoryFilter}
                </button>
                {activeSubcategories.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubCategoryFilter(sub.name)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                      selectedSubCategoryFilter === sub.name ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    ↳ {sub.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            {isTableLockedByReservation ? (
              <div className="flex flex-col items-center justify-center h-full space-y-3 bg-amber-50/50 border border-amber-200 rounded-3xl p-8 text-center">
                <span className="text-3xl">⚠️</span>
                <h3 className="font-black text-sm uppercase text-amber-900">Table is Currently Reserved</h3>
                <p className="text-xs text-amber-700 max-w-md">
                  This table is booked for a pre-scheduled reservation. Order entry is locked until the customer arrives and you click **"Attended"** on the table tile on the left sidebar.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {filteredProducts.length > 0 ? filteredProducts.map(item => {
                  const dealSummary = getDealItemsSummary(item)
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleProductClick(item)}
                      disabled={item.in_stock === false}
                      className={`bg-white border rounded-2xl p-3 text-left flex flex-col justify-between transition group shadow-2xs relative overflow-hidden h-52 cursor-pointer ${
                        item.in_stock === false ? 'opacity-50 cursor-not-allowed border-red-200' : 'border-gray-200 hover:border-slate-900 hover:shadow-md'
                      }`}
                    >
                      {item.badge_enabled && item.badge_text && (
                        <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md shadow-2xs z-10">
                          {item.badge_text}
                        </span>
                      )}
                      
                      <div className="w-full h-24 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center overflow-hidden p-1 shrink-0">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-contain drop-shadow-sm transition duration-200" />
                        ) : (
                          <span className="text-xl">📦</span>
                        )}
                      </div>

                      <div className="space-y-1 flex-1 flex flex-col justify-between pt-1 overflow-hidden">
                        <div>
                          <h4 className="font-bold text-xs text-gray-900 truncate">{item.name}</h4>
                          {dealSummary ? (
                            <div className="text-[9px] text-gray-500 line-clamp-2 leading-tight mt-0.5 bg-gray-50 p-1 rounded border border-gray-100 overflow-y-auto max-h-7">
                              <span className="font-bold text-emerald-700">Includes:</span> {dealSummary.join(', ')}
                            </div>
                          ) : (
                            <p className="text-[9px] text-gray-400 truncate">{item.category || 'General'}</p>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-center pt-1 shrink-0">
                          <span className="font-mono text-emerald-700 font-extrabold text-xs">{currencySymbol} {item.price}</span>
                          <span className="w-6 h-6 rounded-lg bg-gray-100 group-hover:bg-slate-900 group-hover:text-white flex items-center justify-center font-bold text-xs transition">
                            +
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                }) : (
                  <div className="col-span-5 text-center py-20 text-gray-400 text-xs">
                    No {profile.terminology.productsLabel.toLowerCase()} found in database for this tenant. Add items via your inventory manager.
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* COLUMN 3: ACTIVE CART & CHECKOUT */}
        <aside className="w-96 bg-white border-l border-gray-200 flex flex-col shrink-0 shadow-2xs">
          {!profile.modules.hasTables && (
            <div className="px-4 py-3 bg-slate-50 border-b border-gray-200 flex justify-between items-center text-[11px]">
              <span className="font-black text-slate-900 uppercase">⚡ Counter Sale Mode</span>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Direct Dispatch</span>
            </div>
          )}

          {/* CUSTOMER DETAILS & ASSIGN WAITER BLOCK */}
          <div className="p-3 border-b border-gray-200 bg-gray-50/80 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold uppercase text-gray-500 text-[10px]">Customer Details</span>
                {crmStatus === 'found' && <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">✨ CRM Match</span>}
                {crmStatus === 'searching' && <span className="text-[9px] text-gray-400 animate-pulse">🔍...</span>}
                {crmStatus === 'new' && (
                  <button 
                    type="button"
                    onClick={() => {
                      setNewCustNameInput('')
                      setNewCustEmailInput('')
                      setNewCustAddressInput(deliveryAddress || '')
                      setShowNewCustomerModal(true)
                    }}
                    className="text-[9px] bg-amber-100 hover:bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-black transition animate-bounce cursor-pointer"
                  >
                    + Add New Customer
                  </button>
                )}
              </div>
              <button 
                type="button" 
                onClick={() => { setCustomerName('Walk-In Customer'); setCustomerPhone(''); setDeliveryAddress(''); setDeliveryNote(''); setCrmStatus('idle'); }}
                className="text-[9px] text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
              >
                Reset
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Name (Walk-In)"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 font-medium text-gray-900"
              />
              <input
                type="text"
                placeholder="Phone (Auto-lookup)"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 font-mono text-gray-900"
              />
            </div>

            {/* ASSIGN WAITER FIELD */}
            {profile.modules.hasTables && serviceType === 'DINE-IN' && (
              <div className="relative">
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5 uppercase">Assign Waiter</label>
                <input
                  type="text"
                  placeholder="Select or type waiter name..."
                  value={waiterSearchInput}
                  onFocus={() => setShowWaiterDropdown(true)}
                  onChange={e => {
                    setWaiterSearchInput(e.target.value)
                    setShowWaiterDropdown(true)
                    const matched = waiters.find(w => (w.full_name || w.name || '').toLowerCase() === e.target.value.toLowerCase().trim())
                    if (matched) {
                      setSelectedWaiter(matched)
                    } else {
                      const partialMatch = waiters.find(w => (w.full_name || w.name || '').toLowerCase().includes(e.target.value.toLowerCase().trim()))
                      if (partialMatch && e.target.value.trim().length > 2) {
                        setSelectedWaiter(partialMatch)
                      }
                    }
                  }}
                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 font-medium text-gray-900 focus:outline-none focus:border-purple-600"
                />
                
                {/* Waiter Dropdown Selection Menu */}
                {showWaiterDropdown && matchingWaiters.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 max-h-40 overflow-y-auto">
                    <div
                      onClick={() => {
                        setSelectedWaiter(null)
                        setWaiterSearchInput('')
                        setShowWaiterDropdown(false)
                      }}
                      className="px-3 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 cursor-pointer border-b border-gray-100"
                    >
                      -- No Waiter Assigned --
                    </div>
                    {matchingWaiters.map(w => (
                      <div
                        key={w.id}
                        onClick={() => {
                          setSelectedWaiter(w)
                          setWaiterSearchInput(w.full_name || w.name)
                          setShowWaiterDropdown(false)
                        }}
                        className={`px-3 py-2 text-xs font-bold cursor-pointer flex justify-between items-center hover:bg-purple-50 ${
                          selectedWaiter?.id === w.id ? 'bg-purple-100 text-purple-900' : 'text-gray-800'
                        }`}
                      >
                        <span>{w.full_name || w.name}</span>
                        <span className="text-[10px] text-gray-400 uppercase">{w.role || 'Waiter'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {serviceType === 'DELIVERY' && (
              <div className="space-y-1.5">
                <input
                  type="text"
                  placeholder="Delivery Address * (Mandatory for Delivery)"
                  value={deliveryAddress}
                  onChange={e => setDeliveryAddress(e.target.value)}
                  className="w-full bg-white border border-rose-300 rounded-lg px-2.5 py-1.5 font-medium text-gray-900 focus:outline-none focus:border-rose-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Special Instruction Note (e.g. Ring bell twice)"
                  value={deliveryNote}
                  onChange={e => setDeliveryNote(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 font-medium text-gray-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>

          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center text-[11px]">
            <div>
              <span className="font-black text-gray-900">Active Order {activeOrderNumber !== 'PENDING' ? `(${activeOrderNumber})` : '(Not Started)'}</span>
              {profile.modules.hasTables && serviceType === 'DINE-IN' && selectedTable && (
                <span className="ml-1.5 font-mono font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                  Table {selectedTable.name || selectedTable.table_number}
                </span>
              )}
            </div>
            <button onClick={handleClearCartAndCustomer} className="text-red-600 font-bold hover:underline text-[10px] cursor-pointer">
              🗑️ CLEAR
            </button>
          </div>

          <div className="flex-1 p-3 overflow-y-auto space-y-2.5 divide-y divide-gray-100">
            {currentCart.length > 0 ? (
              currentCart.map((ci, idx) => (
                <div key={idx} className="pt-2.5 first:pt-0 flex justify-between items-start text-xs">
                  <div className="space-y-0.5 flex-1 pr-2">
                    <div className="flex items-center space-x-1.5">
                      <h5 className="font-bold text-gray-900">{ci.name}</h5>
                      {ci.sentToKitchen && (
                        <span className="text-[8px] bg-slate-200 text-slate-700 px-1 py-0.2 rounded font-mono font-bold" title="Already sent to kitchen">
                          ✓ Sent
                        </span>
                      )}
                    </div>
                    {ci.selectedVariant && (
                      <span className="text-[10px] text-purple-700 font-semibold block">• Variant: {ci.selectedVariant.name}</span>
                    )}
                    {ci.dealComponents && ci.dealComponents.length > 0 && (
                      <div className="text-[10px] text-emerald-700 space-y-0.5 pt-0.5 pl-2 border-l-2 border-emerald-500 my-1">
                        {ci.dealComponents.map((dc: any, dcIdx: number) => (
                          <div key={dcIdx}>↳ {dc.qty}x {dc.name}</div>
                        ))}
                      </div>
                    )}
                    {ci.selectedAddons && ci.selectedAddons.length > 0 && (
                      <div className="text-[10px] text-blue-700 space-y-0.5 pt-0.5">
                        {ci.selectedAddons.map((ao: any, aIdx: number) => {
                          const varText = ao.selectedVariant ? ` (${ao.selectedVariant.name})` : ''
                          const varPrice = ao.selectedVariant ? ao.selectedVariant.price : 0
                          const totalAoPrice = ao.price + varPrice
                          return (
                            <div key={aIdx}>+ {ao.name}{varText} ({currencySymbol} {totalAoPrice})</div>
                          )
                        })}
                      </div>
                    )}
                    <div className="flex items-center space-x-3 pt-1">
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                        <button onClick={() => {
                          const updated = [...currentCart]
                          if (updated[idx].qty > 1) updated[idx].qty -= 1
                          updateCurrentCart(updated)
                        }} className="px-2 py-0.5 hover:bg-gray-200 font-bold cursor-pointer">-</button>
                        <span className="px-2 py-0.5 font-mono font-bold text-gray-900">{ci.qty}</span>
                        <button onClick={() => {
                          const updated = [...currentCart]
                          updated[idx].qty += 1
                          updateCurrentCart(updated)
                        }} className="px-2 py-0.5 hover:bg-gray-200 font-bold cursor-pointer">+</button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right space-y-1">
                    <div className="font-mono font-black text-gray-950">{currencySymbol} {ci.finalUnitPrice * ci.qty}</div>
                    <button onClick={() => updateCurrentCart(currentCart.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-600 text-xs cursor-pointer">
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 text-gray-400 text-xs">Cart is empty. Select items from catalog.</div>
            )}
          </div>

          <div className="p-3 border-t border-gray-200 bg-gray-50 space-y-2.5">
            <div className="space-y-1 text-xs font-medium">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-mono text-gray-900">{currencySymbol} {subtotal}</span>
              </div>
              
              <div className="flex items-center justify-between text-gray-600">
                <span>Service Charges</span>
                <input
                  type="number"
                  min="0"
                  value={serviceCharges || ''}
                  onChange={e => setServiceCharges(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-20 bg-white border border-gray-200 rounded px-1.5 py-0.5 font-mono text-right text-gray-900 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span>Discount</span>
                <input
                  type="number"
                  min="0"
                  value={discountAmount || ''}
                  onChange={e => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-20 bg-white border border-gray-200 rounded px-1.5 py-0.5 font-mono text-right text-gray-900 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              {serviceType === 'DELIVERY' && (
                <div className="flex items-center justify-between text-gray-600">
                  <span>Delivery Charges</span>
                  <input
                    type="number"
                    min="0"
                    value={deliveryCharges || ''}
                    onChange={e => setDeliveryCharges(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                    className="w-20 bg-white border border-gray-200 rounded px-1.5 py-0.5 font-mono text-right text-gray-900 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              )}

              {calculatedTax > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>GST ({businessGstRate}%)</span>
                  <span className="font-mono text-gray-900">{currencySymbol} {calculatedTax}</span>
                </div>
              )}

              {isFbrSyncActive && (
                <div className="flex items-center justify-between text-[11px] text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">
                  <span className="font-bold">FBR Fiscal Linked</span>
                  <span className="font-mono font-semibold">{business.fbr_pos_id}</span>
                </div>
              )}

              <div className="flex justify-between text-base font-black text-gray-950 pt-2 border-t border-gray-200">
                <span>TOTAL PAYABLE</span>
                <span className="font-mono text-emerald-700 text-lg">{currencySymbol} {grandTotal}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {profile.modules.hasKDS && (
                <button 
                  onClick={handleSendToKitchen}
                  disabled={currentCart.length === 0 || isTableLockedByReservation}
                  className="w-full py-2.5 bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-black rounded-xl text-xs transition uppercase tracking-wide cursor-pointer"
                >
                  🍳 Send to Kitchen (KDS)
                </button>
              )}

              {effectiveModules.hasDispatchQueue && serviceType === 'DELIVERY' && (
                <button 
                  onClick={handleSendToDispatch}
                  disabled={currentCart.length === 0 || isTableLockedByReservation}
                  className="w-full py-2.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white font-black rounded-xl text-xs transition uppercase tracking-wide cursor-pointer"
                >
                  📦 Send to Dispatch Queue
                </button>
              )}

              <button 
                onClick={openSettlementModal}
                disabled={currentCart.length === 0 || isTableLockedByReservation}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black rounded-xl text-xs transition flex justify-between items-center px-4 uppercase tracking-wide shadow-sm cursor-pointer"
              >
                <span>💳 Settle & Pay</span>
                <span className="font-mono text-sm">{currencySymbol} {grandTotal}</span>
              </button>
            </div>
          </div>
        </aside>

      </div>
      )}

    </div>
  )
}