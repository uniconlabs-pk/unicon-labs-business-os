'use client'

import { useState, useEffect, use, useMemo, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { getBusinessProfile } from '@/lib/businessProfiles'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function RestaurantStorefrontReplica({ params }: PageProps) {
  const { slug } = use(params)
  const router = useRouter()
  const menuSectionRef = useRef<HTMLDivElement>(null)
  const productDisplayRef = useRef<HTMLDivElement>(null)

  const [business, setBusiness] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [categories, setCategories] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [addOnsProducts, setAddOnsProducts] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null)

  // Mega Menu Drawer State
  const [showMegaMenu, setShowMegaMenu] = useState(false)

  // Cart & Service State
  const [cart, setCart] = useState<any[]>([])
  const [serviceType, setServiceType] = useState<'TAKEAWAY' | 'DELIVERY'>('DELIVERY')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [showCartDrawer, setShowCartDrawer] = useState(false)

  // Customization Modal State
  const [showCustomizeModal, setShowCustomizeModal] = useState(false)
  const [customizingItem, setCustomizingItem] = useState<any>(null)
  const [selectedVariant, setSelectedVariant] = useState<any>(null)
  const [selectedAddons, setSelectedAddons] = useState<any[]>([])
  const [addonVariants, setAddonVariants] = useState<{ [addonId: string]: any }>({})

  // Horizontal Scroll Reference for All Categories mode
  const scrollRowRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  useEffect(() => {
    async function fetchStorefrontData() {
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

      const [{ data: catData }, { data: productData }] = await Promise.all([
        supabase.from('categories').select('*').eq('business_id', biz.id).order('sort_order', { ascending: true }),
        supabase.from('products').select('*').eq('business_id', biz.id).order('sort_order', { ascending: true })
      ])

      if (catData) setCategories(catData)
      if (productData) {
        setProducts(productData)
        const addons = productData.filter((p: any) => p.category?.toUpperCase() === 'ADD ONS' || p.category?.toUpperCase() === 'ADD-ONS')
        setAddOnsProducts(addons)
      }
      setLoading(false)
    }

    fetchStorefrontData()
  }, [slug, router])

  const currencySymbol = business?.currency_symbol || 'Rs.'

  // Strict Mother Categories Only
  const motherCategories = useMemo(() => {
    return (categories || []).filter(c => !c.parent_id || c.parent_id === '')
  }, [categories])

  const activeMotherCategoryObj = useMemo(() => {
    if (selectedCategory === 'ALL') return null
    return (categories || []).find(c => c.name === selectedCategory) || null
  }, [selectedCategory, categories])

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

  // Filtered Products for Single Category View
  const filteredProducts = useMemo(() => {
    const list = products || []
    return list.filter(p => {
      const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      
      if (!matchesSearch || p.in_stock === false) return false
      if (selectedCategory === 'ALL') return true

      if (selectedSubCategory) {
        const primary = p.category || 'GENERAL'
        const linked = p.linked_categories || []
        return [primary, ...linked].includes(selectedSubCategory)
      } else {
        const targetNames = getDescendantNames(selectedCategory)
        const primary = p.category || 'GENERAL'
        const linked = p.linked_categories || []
        return [primary, ...linked].some(c => targetNames.includes(c))
      }
    }).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }, [products, searchQuery, selectedCategory, selectedSubCategory, getDescendantNames])

  // Grouped Categories for "ALL" View
  const allCategoriesGrouped = useMemo(() => {
    const list = products || []
    const searched = list.filter(p => {
      const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSearch && p.in_stock !== false
    })

    return motherCategories.map(mother => {
      const targetNames = getDescendantNames(mother.name)
      const catItems = searched.filter(p => {
        const primary = p.category || 'GENERAL'
        const linked = p.linked_categories || []
        return [primary, ...linked].some(c => targetNames.includes(c))
      }).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

      return {
        category: mother,
        items: catItems
      }
    }).filter(group => group.items.length > 0)
  }, [motherCategories, products, searchQuery, getDescendantNames])

  const triggerScrollReset = () => {
    requestAnimationFrame(() => {
      if (menuSectionRef.current) {
        const rect = menuSectionRef.current.getBoundingClientRect()
        const absoluteTop = rect.top + window.pageYOffset
        window.scrollTo({ top: absoluteTop, behavior: 'auto' })
      }
    })
  }

  const handleCategorySelect = (catName: string) => {
    setSelectedCategory(catName)
    setSelectedSubCategory(null)
    triggerScrollReset()
  }

  const handleSubCategorySelect = (subName: string | null) => {
    setSelectedSubCategory(subName)
    triggerScrollReset()
  }

  const scrollCategoryRow = (catId: string, direction: 'left' | 'right') => {
    const rowEl = scrollRowRefs.current[catId]
    if (rowEl) {
      const scrollAmount = direction === 'left' ? -350 : 350
      rowEl.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  const getDealItemsSummary = (item: any) => {
    if (!item.is_deal || !item.deal_items) return null
    try {
      const parsedItems = typeof item.deal_items === 'string' ? JSON.parse(item.deal_items) : item.deal_items
      if (!Array.isArray(parsedItems) || parsedItems.length === 0) return null
      return parsedItems.map((di: any) => {
        const foundProd = products.find((p: any) => p.id === di.itemId)
        return `${di.qty || 1}x ${foundProd ? foundProd.name : 'Item'}`
      })
    } catch {
      return null
    }
  }

  const handleProductCardClick = (item: any) => {
    const hasVariants = item.variants && item.variants.length > 0
    const hasModifiers = item.has_modifiers && addOnsProducts.length > 0

    if (hasVariants || hasModifiers) {
      setCustomizingItem(item)
      setSelectedVariant(hasVariants ? item.variants[0] : null)
      setSelectedAddons([])
      setAddonVariants({})
      setShowCustomizeModal(true)
    } else {
      addToCart({
        ...item,
        qty: 1,
        selectedVariant: null,
        selectedAddons: [],
        finalUnitPrice: item.price
      })
    }
  }

  const addToCart = (newItem: any) => {
    const cartKey = `${newItem.id}-${newItem.selectedVariant ? newItem.selectedVariant.name : 'base'}-${(newItem.selectedAddons || []).map((a: any) => a.id).sort().join('-')}`
    const existingIndex = cart.findIndex(ci => ci.cartKey === cartKey)

    if (existingIndex > -1) {
      const updated = [...cart]
      updated[existingIndex].qty += 1
      setCart(updated)
    } else {
      setCart([...cart, { ...newItem, cartKey }])
    }
    setShowCartDrawer(true)
  }

  const handleAddCustomizedToCart = () => {
    if (!customizingItem) return
    const variantPrice = selectedVariant?.price || 0
    const addonsTotal = selectedAddons.reduce((acc, a) => {
      const chosenVar = addonVariants[a.id]
      return acc + (a.price || 0) + (chosenVar?.price || 0)
    }, 0)

    const finalUnitPrice = customizingItem.price + variantPrice + addonsTotal
    const formattedAddons = selectedAddons.map(a => ({ ...a, selectedVariant: addonVariants[a.id] || null }))

    addToCart({
      ...customizingItem,
      qty: 1,
      selectedVariant,
      selectedAddons: formattedAddons,
      finalUnitPrice
    })

    setShowCustomizeModal(false)
    setCustomizingItem(null)
  }

  const subtotal = cart.reduce((acc, item) => acc + (item.finalUnitPrice * item.qty), 0)
  const deliveryFee = serviceType === 'DELIVERY' ? 150 : 0
  const grandTotal = subtotal + deliveryFee

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Please enter your Name and Mobile Number to proceed.')
      return
    }
    if (serviceType === 'DELIVERY' && !deliveryAddress.trim()) {
      alert('Delivery orders require a valid delivery address.')
      return
    }

    setIsCheckingOut(true)
    try {
      const { data: bizData } = await supabase.from('businesses').select('next_order_seq').eq('id', business.id).single()
      const nextSeq = Number(bizData?.next_order_seq ?? 100000)
      const orderCode = `KB-${String(nextSeq).padStart(6, '0')}`

      const orderPayload = {
        business_id: business.id,
        slug: slug,
        order_number: nextSeq,
        items: cart,
        subtotal: subtotal,
        delivery_charges: deliveryFee,
        total_amount: grandTotal,
        service_type: serviceType,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        delivery_address: deliveryAddress.trim() || null,
        payment_method: 'CASH ON DELIVERY / ONLINE',
        fiscal_status: 'non_fiscal'
      }

      const { error } = await supabase.from('orders').insert([orderPayload])
      if (error) throw error

      await supabase.from('businesses').update({ next_order_seq: nextSeq + 1 }).eq('id', business.id)

      alert(`Order ${orderCode} placed successfully! Thank you for ordering from ${business.name}.`)
      setCart([])
      setShowCartDrawer(false)
      setCustomerName('')
      setCustomerPhone('')
      setDeliveryAddress('')
    } catch (err: any) {
      alert(`Checkout failed: ${err.message || err}`)
    } finally {
      setIsCheckingOut(false)
    }
  }

  if (loading || !profile) {
    return <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center font-bold text-gray-800">Loading Storefront...</div>
  }

  const activeBannerImg = business?.banner_url && business.banner_url.trim() !== ''
    ? business.banner_url
    : 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=80'

  const totalAvailableCount = selectedCategory === 'ALL' 
    ? products.filter(p => p.in_stock !== false).length 
    : filteredProducts.length

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-gray-900 font-sans flex flex-col justify-between">
      
      <div>
        {/* STORE HEADER */}
        <header className="bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-xs">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowMegaMenu(true)}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl flex items-center justify-center text-lg font-black transition shadow-2xs mr-1"
                title="Open Menu"
              >
                ☰
              </button>

              <div className="w-12 h-12 bg-white rounded-2xl border border-gray-200 flex items-center justify-center overflow-hidden shadow-xs p-1">
                {business?.logo_url ? (
                  <img src={business.logo_url} alt={business.name} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-xl">🍔</span>
                )}
              </div>
              <div>
                <h1 className="text-base font-black tracking-wider uppercase text-gray-900">{business?.name}</h1>
                <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-widest">
                  ● SCHEDULE: 07:00 PM TO 02:00 AM
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowCartDrawer(true)}
                className="relative px-5 py-2.5 bg-[#FFB800] hover:bg-[#F2B000] text-gray-900 rounded-2xl text-xs font-black tracking-wider uppercase transition shadow-md flex items-center space-x-2"
              >
                <span>🛒 CART</span>
                <span className="bg-white text-gray-900 font-mono px-2 py-0.5 rounded-xl text-xs font-black">
                  {cart.reduce((sum, i) => sum + i.qty, 0)}
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* HERO BANNER SECTION */}
        <div className="relative bg-gray-900 border-b border-gray-200 py-24 md:py-36 px-6 text-center overflow-hidden">
          <div className="absolute inset-0 opacity-30 bg-cover bg-center" style={{ backgroundImage: `url('${activeBannerImg}')` }} />
          <div className="relative z-10 max-w-7xl mx-auto space-y-4">
            <div className="inline-block bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-extrabold uppercase px-3.5 py-1.5 rounded-full tracking-widest">
              🔥 100% Halal & Fresh • Fast Delivery
            </div>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white drop-shadow-lg">
              Hot & fresh fast-food delivered straight to your door
            </h2>
            <p className="text-xs md:text-sm text-gray-200 font-medium max-w-xl mx-auto">
              {business?.address || 'Quaid Park, Shah Faisal Colony No.3, Karachi 75230 Pakistan'}
            </p>
          </div>
        </div>

        {/* MAIN STOREFRONT CONTAINER */}
        <main className="max-w-7xl mx-auto px-6">
          
          {/* STICKY EXPLORE OUR MENU SECTION */}
          <div ref={menuSectionRef} className="sticky top-0 z-30 pt-0 bg-[#FFFDF9]/95 backdrop-blur-md space-y-1 pb-1">
            <div className="bg-white border border-[#F3ECE1] rounded-[28px] p-5 md:p-6 shadow-[0_4px_25px_rgba(0,0,0,0.06)] space-y-3">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2 border-b border-gray-100">
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-gray-900 flex items-center space-x-2">
                  <span>EXPLORE</span> <span className="text-[#E53935]">OUR MENU</span>
                </h2>
                <div className="bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2] px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 shadow-2xs">
                  <span>✕</span>
                  <span>{totalAvailableCount} Items Available</span>
                </div>
              </div>

              {/* Search Input Bar */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search zinger, burgers, deals, fries, drinks..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-gray-200 rounded-2xl pl-11 pr-4 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#E53935] font-medium transition"
                />
              </div>

              {/* Category Pills Bar */}
              <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                <button
                  onClick={() => handleCategorySelect('ALL')}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold uppercase whitespace-nowrap transition flex items-center space-x-1 shrink-0 ${
                    selectedCategory === 'ALL' 
                      ? 'bg-[#E53935] text-white shadow-[0_4px_12px_rgba(229,57,53,0.3)]' 
                      : 'bg-[#FAF7F2] text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <span>🗂️</span>
                  <span>All Categories</span>
                </button>

                {motherCategories.map(cat => {
                  const isActive = selectedCategory === cat.name
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat.name)}
                      className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold uppercase whitespace-nowrap transition flex items-center space-x-1 shrink-0 ${
                        isActive 
                          ? 'bg-[#E53935] text-white shadow-[0_4px_12px_rgba(229,57,53,0.3)]' 
                          : 'bg-[#FAF7F2] text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <span>🍽️</span>
                      <span>{cat.name}</span>
                    </button>
                  )
                })}
              </div>

              {/* Contextual Sub-Categories Bar */}
              {selectedCategory !== 'ALL' && activeSubcategories.length > 0 && (
                <div className="flex items-center space-x-1.5 pt-1.5 border-t border-gray-100 overflow-x-auto">
                  <span className="text-[10px] font-bold uppercase text-gray-400 whitespace-nowrap">Sub-categories:</span>
                  <button
                    onClick={() => handleSubCategorySelect(null)}
                    className={`px-3 py-1 rounded-xl text-[11px] font-bold transition whitespace-nowrap ${
                      selectedSubCategory === null ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    All in {selectedCategory}
                  </button>
                  {activeSubcategories.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => handleSubCategorySelect(sub.name)}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold transition whitespace-nowrap ${
                        selectedSubCategory === sub.name ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      ↳ {sub.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* PRODUCT ITEMS SECTION CONTAINER (Bound with productDisplayRef) */}
          <div ref={productDisplayRef} className="pt-1.5">
            {selectedCategory === 'ALL' && !searchQuery.trim() ? (
              <div className="space-y-2.5 pb-20">
                {allCategoriesGrouped.map(group => (
                  <div key={group.category.id} className="bg-white border border-[#F3ECE1] rounded-[28px] p-5 md:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-2.5">
                    
                    {/* Category Row Header */}
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <div className="flex items-center space-x-2">
                        <span className="text-[#E53935] text-base">🍽️</span>
                        <h3 className="text-base font-black uppercase text-gray-900">{group.category.name}</h3>
                        <span className="bg-[#FAF7F2] border border-gray-200 text-gray-700 font-mono font-bold px-2.5 py-0.5 rounded-lg text-[10px]">
                          {group.items.length} items
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => scrollCategoryRow(group.category.id, 'left')}
                          className="w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full flex items-center justify-center font-bold text-xs transition shadow-2xs"
                          title="Scroll Left"
                        >
                          ‹
                        </button>
                        <button
                          onClick={() => scrollCategoryRow(group.category.id, 'right')}
                          className="w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full flex items-center justify-center font-bold text-xs transition shadow-2xs"
                          title="Scroll Right"
                        >
                          ›
                        </button>
                      </div>
                    </div>

                    {/* Horizontal Scrolling Row of Product Cards */}
                    <div
                      ref={el => { scrollRowRefs.current[group.category.id] = el }}
                      className="flex space-x-5 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent snap-x"
                    >
                      {group.items.map(item => {
                        const dealSummary = getDealItemsSummary(item)
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleProductCardClick(item)}
                            className="w-[260px] sm:w-[280px] shrink-0 bg-[#FFFDF9] border border-[#F3ECE1] hover:border-gray-300 rounded-[24px] flex flex-col justify-between transition cursor-pointer group shadow-[0_4px_20px_rgba(0,0,0,0.05)] relative overflow-hidden snap-start"
                          >
                            <div className="w-full h-44 bg-[#FDFBF7] flex items-center justify-center p-4 relative overflow-hidden shrink-0">
                              {item.badge_enabled && item.badge_text && (
                                <span className="absolute top-3 right-3 bg-emerald-600 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-lg shadow-md z-10">
                                  {item.badge_text}
                                </span>
                              )}
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="w-full h-full object-contain group-hover:scale-105 transition duration-300 drop-shadow-sm" />
                              ) : (
                                <span className="text-4xl">🍔</span>
                              )}
                            </div>

                            <div className="p-4 flex flex-col justify-between flex-1 bg-white rounded-b-[24px]">
                              <div className="space-y-1">
                                <h4 className="font-black text-sm text-gray-900 tracking-tight truncate">{item.name}</h4>
                                {dealSummary ? (
                                  <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">
                                    <span className="text-emerald-700 font-bold">Includes:</span> {dealSummary.join(', ')}
                                  </p>
                                ) : (
                                  <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">
                                    {item.description || item.category || 'Fresh & crispy specialty item.'}
                                  </p>
                                )}
                              </div>

                              <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between">
                                <div className="flex items-baseline space-x-0.5 font-mono">
                                  <span className="text-xs font-bold text-[#C52224]">Rs</span>
                                  <span className="text-xl font-black text-[#C52224] tracking-tight">{item.price}</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleProductCardClick(item)
                                  }}
                                  className="bg-[#FFB800] hover:bg-[#F2B000] text-gray-900 font-black px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1 shadow-[0_4px_12px_rgba(255,184,0,0.3)] transition transform active:scale-95"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9" />
                                  </svg>
                                  <span>ADD</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                  </div>
                ))}
              </div>
            ) : (
              /* STANDARD GRID VIEW FOR SPECIFIC CATEGORY */
              <div className="space-y-2 pb-20">
                <div className="bg-white border border-[#F3ECE1] rounded-2xl px-6 py-3 flex justify-between items-center shadow-2xs">
                  <h3 className="text-sm font-black uppercase text-gray-900 flex items-center space-x-2">
                    <span className="text-[#E53935]">🍽️</span>
                    <span>{selectedSubCategory || selectedCategory}</span>
                  </h3>
                  <span className="bg-[#FAF7F2] border border-gray-200 text-gray-700 font-mono font-bold px-3 py-0.5 rounded-xl text-xs">
                    {filteredProducts.length} items
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredProducts.length > 0 ? filteredProducts.map(item => {
                    const dealSummary = getDealItemsSummary(item)
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleProductCardClick(item)}
                        className="bg-[#FFFDF9] border border-[#F3ECE1] hover:border-gray-300 rounded-[24px] flex flex-col justify-between transition cursor-pointer group shadow-[0_4px_20px_rgba(0,0,0,0.05)] relative overflow-hidden"
                      >
                        <div className="w-full h-48 bg-[#FDFBF7] flex items-center justify-center p-4 relative overflow-hidden shrink-0">
                          {item.badge_enabled && item.badge_text && (
                            <span className="absolute top-3 right-3 bg-emerald-600 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-lg shadow-md z-10">
                              {item.badge_text}
                            </span>
                          )}
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-contain group-hover:scale-105 transition duration-300 drop-shadow-sm" />
                          ) : (
                            <span className="text-4xl">🍔</span>
                          )}
                        </div>

                        <div className="p-5 flex flex-col justify-between flex-1 bg-white rounded-b-[24px]">
                          <div className="space-y-1.5">
                            <h4 className="font-black text-base text-gray-900 tracking-tight">{item.name}</h4>
                            {dealSummary ? (
                              <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                                <span className="text-emerald-700 font-bold">Includes:</span> {dealSummary.join(', ')}
                              </p>
                            ) : (
                              <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                                {item.description || item.category || 'Fresh & crispy fast food specialty item.'}
                              </p>
                            )}
                          </div>

                          <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
                            <div className="flex items-baseline space-x-0.5 font-mono">
                              <span className="text-xs font-bold text-[#C52224]">Rs</span>
                              <span className="text-2xl font-black text-[#C52224] tracking-tight">{item.price}</span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleProductCardClick(item)
                              }}
                              className="bg-[#FFB800] hover:bg-[#F2B000] text-gray-900 font-black px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-[0_4px_12px_rgba(255,184,0,0.3)] transition transform active:scale-95"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9" />
                              </svg>
                              <span>ADD</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  }) : (
                    <div className="col-span-full text-center py-24 text-gray-400 text-xs uppercase tracking-wider font-bold">
                      No menu items available in this category.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </main>
      </div>

      {/* FOOTER AREA */}
      <footer className="bg-[#1A1612] text-slate-300 font-sans border-t-4 border-[#FFB800]">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8 text-xs">
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center p-1 shadow-md shrink-0">
                {business?.logo_url ? (
                  <img src={business.logo_url} alt="" className="w-full h-full object-contain" />
                ) : (
                  <span>🍔</span>
                )}
              </div>
              <div>
                <h3 className="font-black text-white text-sm tracking-wide uppercase">{business?.name || 'KRUNCHY BITE'}</h3>
                <p className="text-[10px] text-[#FFB800] font-bold uppercase tracking-widest">Tasty - Juicy - Spicy</p>
              </div>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              {business?.name || 'Krunchy Bite'} is Karachi's premier destination for ultra-crispy zinger burgers, handcrafted beef & chicken patties, tender fried chicken, and late-night delivery straight to your door in Shah Faisal Colony & nearby areas.
            </p>
            <div className="space-y-1.5 pt-1">
              <div className="inline-flex items-center space-x-1.5 bg-[#2A231C] text-[#FFB800] border border-[#3D3227] px-3 py-1 rounded-full text-[10px] font-bold">
                <span>🕒</span>
                <span>07:00 PM to 02:00 AM (Monday to Sunday)</span>
              </div>
              <div>
                <span className="inline-flex items-center space-x-1 bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-3 py-1 rounded-full text-[10px] font-bold">
                  <span>✓</span>
                  <span>100% Halal & Fresh</span>
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-black text-[#FFB800] uppercase tracking-wider text-xs border-b border-[#2A231C] pb-2">EXPLORE MENU</h4>
            <ul className="space-y-2 font-medium text-slate-300">
              <li>
                <button onClick={() => handleCategorySelect('ALL')} className="hover:text-[#FFB800] transition flex items-center space-x-1.5">
                  <span className="text-[#FFB800]">■</span><span>All Categories</span>
                </button>
              </li>
              {motherCategories.slice(0, 5).map(cat => (
                <li key={cat.id}>
                  <button onClick={() => handleCategorySelect(cat.name)} className="hover:text-[#FFB800] transition flex items-center space-x-1.5">
                    <span className="text-[#FFB800]">■</span><span>{cat.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-black text-[#FFB800] uppercase tracking-wider text-xs border-b border-[#2A231C] pb-2">CUSTOMER SERVICES</h4>
            <ul className="space-y-2 font-medium text-slate-300">
              <li>
                <button onClick={() => setShowCartDrawer(true)} className="hover:text-[#FFB800] transition flex items-center space-x-1.5">
                  <span className="text-[#FFB800]">🚚</span><span>Track Live Order</span>
                </button>
              </li>
              <li>
                <button onClick={() => alert('Privacy Policy: Your data is secure with BusinessOS.')} className="hover:text-[#FFB800] transition flex items-center space-x-1.5">
                  <span className="text-[#FFB800]">🛡️</span><span>Privacy Policy</span>
                </button>
              </li>
              <li>
                <button onClick={() => alert('Terms of Service: Standard fast food ordering rules apply.')} className="hover:text-[#FFB800] transition flex items-center space-x-1.5">
                  <span className="text-[#FFB800]">⚖️</span><span>Terms of Service & Geofence Rules</span>
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-black text-[#FFB800] uppercase tracking-wider text-xs border-b border-[#2A231C] pb-2">BRANCH LOCATION</h4>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              <span className="text-[#FFB800] font-bold">📍 Store Address:</span> {business?.address || 'Quaid Park, Shah Faisal Colony No.3, Karachi 75230 Pakistan'}
            </p>
            <button
              onClick={() => alert('Map Location: ' + (business?.address || 'Karachi'))}
              className="w-full py-2.5 bg-[#FFF8E7] hover:bg-[#FFEFC2] text-gray-900 font-black rounded-xl text-[11px] uppercase tracking-wider shadow transition border border-[#FFD54F]"
            >
              📍 VIEW BRANCH MAP LOCATION
            </button>
            <div className="space-y-1.5 pt-2">
              <span className="font-black text-white text-[10px] uppercase tracking-wider block">CONNECT WITH US:</span>
              <div className="flex space-x-2.5">
                <a href="#" className="w-8 h-8 rounded-full bg-[#2A231C] hover:bg-[#FFB800] hover:text-gray-900 text-white flex items-center justify-center text-xs transition" title="YouTube">▶</a>
                <a href="#" className="w-8 h-8 rounded-full bg-[#2A231C] hover:bg-[#FFB800] hover:text-gray-900 text-white flex items-center justify-center text-xs transition" title="Facebook">f</a>
                <a href="#" className="w-8 h-8 rounded-full bg-[#2A231C] hover:bg-[#FFB800] hover:text-gray-900 text-white flex items-center justify-center text-xs transition" title="Instagram">📸</a>
                <a href="#" className="w-8 h-8 rounded-full bg-[#2A231C] hover:bg-[#FFB800] hover:text-gray-900 text-white flex items-center justify-center text-xs transition" title="TikTok">🎵</a>
              </div>
            </div>
          </div>

        </div>

        <div className="bg-[#120F0D] border-t border-[#2A231C] py-5 px-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px]">
            <div className="flex items-center space-x-2 text-slate-400">
              <span>Designed & Powered by:</span>
              <span className="font-black text-white tracking-widest bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">UNICON LABS</span>
              <span className="text-[9px] text-slate-500 uppercase tracking-tighter">YOU THINK WE BUILD</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-slate-500">© 2026 {(business?.name || 'KRUNCHY BITE').toUpperCase()} Digital Ecosystem. All Rights Reserved.</span>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="px-3.5 py-1.5 bg-[#E53935] hover:bg-[#C62828] text-white font-black rounded-lg text-[10px] uppercase tracking-wider transition shadow"
              >
                TOP ↑
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* SLIDING MEGA MENU DRAWER */}
      {showMegaMenu && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans">
          <div onClick={() => setShowMegaMenu(false)} className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity" />
          
          <div className="absolute inset-y-0 left-0 max-w-full flex pr-10">
            <div className="w-80 bg-white shadow-2xl flex flex-col text-gray-900 animate-in slide-in-from-left duration-300">
              
              <div className="px-6 py-5 bg-[#D32F2F] text-white flex justify-between items-center shrink-0 shadow-md">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🍽️</span>
                  <h3 className="text-xs font-black uppercase tracking-wider">{(business?.name || 'KRUNCHY BITE').toUpperCase()} MENU</h3>
                </div>
                <button
                  onClick={() => setShowMegaMenu(false)}
                  className="w-7 h-7 bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center justify-center font-bold text-xs transition"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 border-b border-gray-100 bg-[#FAF7F2]">
                <div className="bg-white border border-gray-200 rounded-2xl p-3.5 flex items-center space-x-3 shadow-2xs">
                  <div className="w-10 h-10 rounded-full bg-amber-100 border-2 border-amber-400 flex items-center justify-center font-bold text-amber-800 text-sm overflow-hidden shrink-0">
                    👤
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="font-black text-xs text-gray-900 truncate">Guest Customer</h4>
                    <p className="text-[10px] text-gray-500 font-medium">Guest Mode Active</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-1 text-xs">
                <button
                  onClick={() => { handleCategorySelect('ALL'); setShowMegaMenu(false); }}
                  className="w-full px-4 py-3 rounded-xl hover:bg-gray-100 flex items-center space-x-3 font-extrabold text-gray-800 transition text-left"
                >
                  <span className="text-base">🏠</span>
                  <span>HOME</span>
                </button>
                <button
                  onClick={() => { handleCategorySelect('ALL'); setShowMegaMenu(false); }}
                  className="w-full px-4 py-3 rounded-xl hover:bg-gray-100 flex items-center space-x-3 font-extrabold text-gray-800 transition text-left"
                >
                  <span className="text-base">🍽️</span>
                  <span>EXPLORE MENU</span>
                </button>
                <button
                  onClick={() => { 
                    const dealCat = motherCategories.find(c => c.name.toLowerCase().includes('deal') || c.name.toLowerCase().includes('combo'))
                    if (dealCat) handleCategorySelect(dealCat.name)
                    setShowMegaMenu(false)
                  }}
                  className="w-full px-4 py-3 rounded-xl hover:bg-gray-100 flex items-center space-x-3 font-extrabold text-gray-800 transition text-left"
                >
                  <span className="text-base">🏷️</span>
                  <span>DEALS & COMBOS</span>
                </button>
                <button
                  onClick={() => { alert('Branch Locator: ' + (business?.address || 'Main Branch Karachi')); setShowMegaMenu(false); }}
                  className="w-full px-4 py-3 rounded-xl hover:bg-gray-100 flex items-center space-x-3 font-extrabold text-gray-800 transition text-left"
                >
                  <span className="text-base">📍</span>
                  <span>BRANCH LOCATOR</span>
                </button>
                <button
                  onClick={() => { alert(`${business?.name} - Serving fresh fast food daily.`); setShowMegaMenu(false); }}
                  className="w-full px-4 py-3 rounded-xl hover:bg-gray-100 flex items-center space-x-3 font-extrabold text-gray-800 transition text-left"
                >
                  <span className="text-base">ℹ️</span>
                  <span>ABOUT US</span>
                </button>
              </div>

              <div className="p-5 border-t border-gray-100 bg-gray-50 space-y-4 shrink-0">
                <button
                  onClick={() => { alert('Customer Portal Login/Register coming soon!'); setShowMegaMenu(false); }}
                  className="w-full py-3 bg-[#D32F2F] hover:bg-[#C62828] text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-md flex items-center justify-center space-x-2 transition"
                >
                  <span>🔑</span>
                  <span>LOGIN / REGISTER</span>
                </button>

                <div className="flex justify-center space-x-4 pt-1">
                  <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold cursor-pointer hover:scale-105 transition" title="YouTube">▶</div>
                  <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold cursor-pointer hover:scale-105 transition" title="Facebook">f</div>
                  <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold cursor-pointer hover:scale-105 transition" title="Instagram">📸</div>
                  <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold cursor-pointer hover:scale-105 transition" title="TikTok">🎵</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* CUSTOMIZATION MODAL */}
      {showCustomizeModal && customizingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-gray-900">
            <div className="p-6 pb-3 border-b border-gray-100 flex justify-between items-start">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Customize</span>
                <h3 className="text-base font-black uppercase mt-1">{customizingItem.name}</h3>
                <p className="text-xs font-mono font-bold text-[#C52224]">{currencySymbol} {customizingItem.price}</p>
              </div>
              <button onClick={() => setShowCustomizeModal(false)} className="text-gray-400 hover:text-black font-bold">✕</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {customizingItem.variants && customizingItem.variants.length > 0 && (
                <div className="space-y-2 bg-[#FAF7F2] p-3.5 rounded-2xl border border-gray-200">
                  <span className="text-[11px] font-extrabold uppercase text-gray-700 block">Select Option / Size:</span>
                  <div className="space-y-1.5">
                    {customizingItem.variants.map((v: any, vIdx: number) => (
                      <button
                        key={vIdx}
                        type="button"
                        onClick={() => setSelectedVariant(v)}
                        className={`w-full p-2.5 rounded-xl border text-left flex justify-between items-center text-xs font-bold transition ${
                          selectedVariant?.name === v.name ? 'bg-[#E53935] border-[#E53935] text-white shadow' : 'bg-white border-gray-200 text-gray-800'
                        }`}
                      >
                        <span>{v.name}</span>
                        <span className="font-mono">+{currencySymbol} {v.price}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {customizingItem.has_modifiers && addOnsProducts.length > 0 && (
                <div className="space-y-2 bg-[#FAF7F2] p-3.5 rounded-2xl border border-gray-200">
                  <span className="text-[11px] font-extrabold uppercase text-gray-700 block">Add-ons & Extras:</span>
                  <div className="space-y-2">
                    {addOnsProducts.map((addon: any) => {
                      const isChecked = selectedAddons.some(a => a.id === addon.id)
                      return (
                        <button
                          key={addon.id}
                          type="button"
                          onClick={() => {
                            if (isChecked) setSelectedAddons(selectedAddons.filter(a => a.id !== addon.id))
                            else setSelectedAddons([...selectedAddons, addon])
                          }}
                          className={`w-full p-2.5 rounded-xl border text-left flex justify-between items-center text-xs font-bold transition ${
                            isChecked ? 'bg-blue-50 border-blue-500 text-blue-900' : 'bg-white border-gray-200 text-gray-800'
                          }`}
                        >
                          <span>{isChecked ? '☑' : '☐'} {addon.name}</span>
                          <span className="font-mono">+{currencySymbol} {addon.price}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 pt-3 border-t border-gray-100 bg-[#FAF7F2] flex justify-between items-center">
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Total Price</span>
                <span className="font-mono font-black text-[#C52224] text-base">
                  {currencySymbol} {customizingItem.price + (selectedVariant?.price || 0) + selectedAddons.reduce((acc, a) => acc + (a.price || 0), 0)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddCustomizedToCart}
                className="px-6 py-3 bg-[#FFB800] hover:bg-[#F2B000] text-gray-900 font-black rounded-2xl text-xs uppercase tracking-wider shadow-md"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CART & CHECKOUT DRAWER */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans">
          <div onClick={() => setShowCartDrawer(false)} className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white border-l border-gray-200 shadow-2xl flex flex-col text-gray-900">
              
              <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="text-sm font-extrabold uppercase tracking-wider">Your Order Cart</h3>
                <button onClick={() => setShowCartDrawer(false)} className="text-gray-400 hover:text-black font-bold">✕</button>
              </div>

              {/* Service Type Switcher */}
              <div className="p-4 border-b border-gray-200 bg-gray-50/50">
                <div className="grid grid-cols-2 gap-2 bg-gray-200 p-1 rounded-2xl text-xs font-bold">
                  {(['DELIVERY', 'TAKEAWAY'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setServiceType(type)}
                      className={`py-2 rounded-xl transition ${serviceType === type ? 'bg-[#E53935] text-white shadow' : 'text-gray-600 hover:text-black'}`}
                    >
                      {type === 'DELIVERY' ? '🛵 DELIVERY' : '🛍️ TAKEAWAY'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Inputs */}
              <div className="p-4 border-b border-gray-200 space-y-3 text-xs bg-gray-50/20">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Your Name *"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 font-medium"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Mobile Phone *"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 font-mono"
                    required
                  />
                </div>
                {serviceType === 'DELIVERY' && (
                  <input
                    type="text"
                    placeholder="Full Delivery Address *"
                    value={deliveryAddress}
                    onChange={e => setDeliveryAddress(e.target.value)}
                    className="w-full bg-white border border-rose-300 rounded-xl px-3 py-2 font-medium"
                    required
                  />
                )}
              </div>

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-gray-100">
                {cart.length > 0 ? cart.map((ci, idx) => (
                  <div key={idx} className="pt-3 first:pt-0 flex justify-between items-start text-xs">
                    <div className="space-y-0.5 flex-1 pr-2">
                      <h4 className="font-bold text-gray-900">{ci.name}</h4>
                      {ci.selectedVariant && <span className="text-[10px] text-purple-600 block">Option: {ci.selectedVariant.name}</span>}
                      {ci.selectedAddons?.length > 0 && (
                        <div className="text-[10px] text-blue-600">
                          {ci.selectedAddons.map((a: any, aIdx: number) => <div key={aIdx}>+ {a.name}</div>)}
                        </div>
                      )}
                      <div className="flex items-center space-x-3 pt-1 font-mono">
                        <button onClick={() => {
                          const updated = [...cart]
                          if (updated[idx].qty > 1) updated[idx].qty -= 1
                          else updated.splice(idx, 1)
                          setCart(updated)
                        }} className="px-2 bg-gray-100 rounded font-bold">-</button>
                        <span>{ci.qty}</span>
                        <button onClick={() => {
                          const updated = [...cart]
                          updated[idx].qty += 1
                          setCart(updated)
                        }} className="px-2 bg-gray-100 rounded font-bold">+</button>
                      </div>
                    </div>
                    <div className="text-right font-mono font-black text-[#C52224]">
                      {currencySymbol} {ci.finalUnitPrice * ci.qty}
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-24 text-gray-400 text-xs uppercase tracking-wider font-bold">Your cart is currently empty</div>
                )}
              </div>

              {/* Cart Summary & Checkout */}
              <div className="p-6 border-t border-gray-200 bg-gray-50 space-y-3">
                <div className="space-y-1 text-xs text-gray-600 font-medium font-mono">
                  <div className="flex justify-between"><span>Subtotal</span><span>{currencySymbol} {subtotal}</span></div>
                  {serviceType === 'DELIVERY' && <div className="flex justify-between"><span>Delivery Fee</span><span>{currencySymbol} {deliveryFee}</span></div>}
                  <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-200">
                    <span>Total</span><span className="text-[#C52224]">{currencySymbol} {grandTotal}</span>
                  </div>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={cart.length === 0 || isCheckingOut}
                  className="w-full py-3.5 bg-[#FFB800] hover:bg-[#F2B000] disabled:opacity-50 text-gray-900 font-black rounded-2xl text-xs uppercase tracking-widest shadow-lg transition"
                >
                  {isCheckingOut ? 'Placing Order...' : 'Place Order Now 🚀'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}