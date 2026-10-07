'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function WebSettingsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'header' | 'menu' | 'hero' | 'products' | 'partners' | 'blogs' | 'about' | 'footer'>('header')
  const [saving, setSaving] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [isSidebarHovered, setIsSidebarHovered] = useState(false)

  // CMS States
  const [headerBrand, setHeaderBrand] = useState('UNICON LABS')
  const [headerSlogan, setHeaderSlogan] = useState('YOU THINK WE BUILD')
  const [headerSubtitle, setHeaderSubtitle] = useState('Enterprise Software Company')

  const [menuItems, setMenuItems] = useState([
    { id: 1, label: 'HOME', href: '#home' },
    { id: 2, label: 'Products', href: '#products' },
    { id: 3, label: 'Our Partners', href: '#partners' },
    { id: 4, label: 'About UNICON LABS', href: '#about' },
    { id: 5, label: 'Blogs', href: '#blogs' },
    { id: 6, label: 'Contact Us', href: '#contact' },
  ])
  const [newMenuLabel, setNewMenuLabel] = useState('')
  const [newMenuHref, setNewMenuHref] = useState('')

  const [heroSlideInterval, setHeroSlideInterval] = useState(4500)
  const [heroBanners, setHeroBanners] = useState([
    { id: 1, title: 'POWERING AUTONOMOUS ENTERPRISE ECOSYSTEMS', subtitle: 'Next-generation multi-tenant Business OS designed for scale, speed, and real-time offline sync.', tag: 'FLAGSHIP PLATFORM' },
    { id: 2, title: 'INTELLIGENT POINT OF SALE & KITCHEN DISPLAY', subtitle: 'Streamline multi-tender settlement, split payments, FBR fiscal integration, and instant KOT ticket routing.', tag: 'OPERATIONAL EXCELLENCE' },
    { id: 3, title: 'REAL-TIME LOGISTICS & DISPATCH QUEUE', subtitle: 'Effortlessly manage delivery fleets, rider assignments, and automated customer notifications.', tag: 'SUPPLY CHAIN' },
  ])
  const [newHeroTitle, setNewHeroTitle] = useState('')
  const [newHeroSubtitle, setNewHeroSubtitle] = useState('')
  const [newHeroTag, setNewHeroTag] = useState('')

  const [products, setProducts] = useState([
    { id: 1, name: 'Adaptive POS Terminal', desc: 'Feature-rich multi-surface touchscreen cash register and terminal engine.', image: '🖥️' },
    { id: 2, name: 'Kitchen Display System (KDS)', desc: 'Live order ticket dispatch routing with speed-of-service performance meters.', image: '🍳' },
    { id: 3, name: 'Dispatch & Fulfillment', desc: 'Complete delivery order queue manager with rider tracking and analytics.', image: '📦' },
    { id: 4, name: 'Enterprise ERP & Finance', desc: 'Automated ledger tracking, tax compliance, and comprehensive audit reports.', image: '📊' },
    { id: 5, name: 'Customer Storefront Portal', desc: 'Branded public web ordering storefront connected directly to your POS.', image: '🛍️' }
  ])
  const [newProdName, setNewProdName] = useState('')
  const [newProdDesc, setNewProdDesc] = useState('')
  const [newProdImage, setNewProdImage] = useState('📦')

  const [partners, setPartners] = useState(
    Array.from({ length: 18 }, (_, i) => ({ id: i + 1, name: `Partner Brand ${i + 1}`, logo: '🏢' }))
  )
  const [newPartnerName, setNewPartnerName] = useState('')

  const [blogs, setBlogs] = useState([
    { id: 1, title: 'Scaling Cloud POS Architecture in 2026', date: 'Oct 04, 2026', category: 'Engineering', desc: 'Discover how offline-first Supabase synchronization keeps retail stores running smoothly.' },
    { id: 2, title: 'Optimizing Kitchen Workflow with KDS', date: 'Sep 28, 2026', category: 'Operations', desc: 'Best practices for reducing order preparation times in high-volume restaurants.' },
  ])
  const [newBlogTitle, setNewBlogTitle] = useState('')
  const [newBlogCat, setNewBlogCat] = useState('Engineering')
  const [newBlogDesc, setNewBlogDesc] = useState('')

  const [aboutText, setAboutText] = useState('Founded with a vision to revolutionize enterprise operations, Unicon Labs specializes in building end-to-end digital ecosystems. From multi-tenant POS hardware integrations to cloud synchronization and automated financial auditing, we provide the infrastructure businesses need to thrive.')
  const [footerHQ, setFooterHQ] = useState('Software Development Enterprise\nDigital Ecosystems & Modules\nEmail: care.uniconlabs@gmail.com')

  // Load existing settings from Supabase on mount
  useEffect(() => {
    async function fetchSettings() {
      const { data, error } = await supabase
        .from('unicon_global_settings')
        .select('settings')
        .eq('id', 'main')
        .maybeSingle()

      if (!error && data && data.settings) {
        const s = data.settings
        if (s.headerBrand) setHeaderBrand(s.headerBrand)
        if (s.headerSlogan) setHeaderSlogan(s.headerSlogan)
        if (s.headerSubtitle) setHeaderSubtitle(s.headerSubtitle)
        if (s.menuItems) setMenuItems(s.menuItems)
        if (s.heroSlideInterval) setHeroSlideInterval(s.heroSlideInterval)
        if (s.heroBanners) setHeroBanners(s.heroBanners)
        if (s.products) setProducts(s.products)
        if (s.partners) setPartners(s.partners)
        if (s.blogs) setBlogs(s.blogs)
        if (s.aboutText) setAboutText(s.aboutText)
        if (s.footerHQ) setFooterHQ(s.footerHQ)
      }
      setLoadingData(false)
    }
    fetchSettings()
  }, [])

  const handleSaveChanges = async () => {
    setSaving(true)
    const payload = {
      headerBrand,
      headerSlogan,
      headerSubtitle,
      menuItems,
      heroSlideInterval,
      heroBanners,
      products,
      partners,
      blogs,
      aboutText,
      footerHQ
    }

    const { error } = await supabase
      .from('unicon_global_settings')
      .upsert({ id: 'main', settings: payload, updated_at: new Date().toISOString() })

    setSaving(false)
    if (error) {
      alert(`Failed to save settings: ${error.message}`)
    } else {
      alert('UNICON LABS website settings saved, published, and synced in real-time successfully!')
    }
  }

  const navTabs = [
    { key: 'header', label: 'Header Branding', icon: '🏷️' },
    { key: 'menu', label: 'Menu Bar Options', icon: '📑' },
    { key: 'hero', label: 'Hero Banners', icon: '🚀' },
    { key: 'products', label: 'Products Display', icon: '📦' },
    { key: 'partners', label: 'Respected Partners', icon: '🤝' },
    { key: 'blogs', label: 'Daily Blogs', icon: '📰' },
    { key: 'about', label: 'About UNICON', icon: '🏢' },
    { key: 'footer', label: 'Footer Area', icon: '📌' },
  ] as const

  if (loadingData) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center font-bold text-white">Loading CMS Settings...</div>
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      
      {/* Top Navbar */}
      <header className="px-8 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/80 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-lg text-white shadow">
            🌐
          </div>
          <div>
            <h1 className="text-base font-black tracking-wide uppercase">UNICON LABS — Website CMS Settings</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Manage Header, Menu, Banners, Products, Partners, Blogs & Footer</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push('/master-admin')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition cursor-pointer"
          >
            ← Back to Master Console
          </button>
          <button
            onClick={handleSaveChanges}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow cursor-pointer"
          >
            {saving ? 'Publishing...' : 'Save & Publish Website 🚀'}
          </button>
        </div>
      </header>

      {/* Main Workspace with Left Hover Mega Menu */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Supabase-Style Collapsible Left Mega Menu */}
        <aside
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
          className={`bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out flex flex-col shrink-0 z-40 ${
            isSidebarHovered ? 'w-64' : 'w-16'
          }`}
        >
          <div className="p-3 border-b border-slate-800 text-[10px] font-black uppercase text-slate-500 tracking-widest truncate px-4">
            {isSidebarHovered ? 'Navigation Menu' : '•••'}
          </div>

          <nav className="flex-1 py-3 space-y-1 overflow-y-auto px-2">
            {navTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition text-xs font-bold cursor-pointer ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
                title={tab.label}
              >
                <span className="text-base shrink-0">{tab.icon}</span>
                <span className={`truncate transition-opacity duration-200 uppercase ${isSidebarHovered ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                  {tab.label}
                </span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="p-8 max-w-5xl mx-auto flex-1 w-full space-y-6 overflow-y-auto">
          
          {/* 1. HEADER SETTINGS */}
          {activeTab === 'header' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <h2 className="font-extrabold text-sm uppercase text-blue-400">Header Branding & Slogan</h2>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Brand Name</label>
                  <input type="text" value={headerBrand} onChange={e => setHeaderBrand(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold" />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Brand Slogan</label>
                  <input type="text" value={headerSlogan} onChange={e => setHeaderSlogan(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Subtitle / Category</label>
                  <input type="text" value={headerSubtitle} onChange={e => setHeaderSubtitle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" />
                </div>
              </div>
            </div>
          )}

          {/* 2. MENU BAR SETTINGS */}
          {activeTab === 'menu' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <h2 className="font-extrabold text-sm uppercase text-blue-400">Horizontal Menu Bar Options</h2>
              <div className="space-y-3 text-xs">
                <div className="space-y-2">
                  {menuItems.map((m, idx) => (
                    <div key={m.id} className="flex items-center justify-between bg-slate-950 border border-slate-800 p-3 rounded-xl">
                      <div className="flex space-x-3 items-center">
                        <span className="font-mono text-slate-500">#{idx + 1}</span>
                        <input
                          type="text"
                          value={m.label}
                          onChange={e => {
                            const updated = [...menuItems]
                            updated[idx].label = e.target.value
                            setMenuItems(updated)
                          }}
                          className="bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg text-white font-bold"
                        />
                        <input
                          type="text"
                          value={m.href}
                          onChange={e => {
                            const updated = [...menuItems]
                            updated[idx].href = e.target.value
                            setMenuItems(updated)
                          }}
                          className="bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg text-slate-300 font-mono text-[11px]"
                        />
                      </div>
                      <button
                        onClick={() => setMenuItems(menuItems.filter(item => item.id !== m.id))}
                        className="text-red-400 hover:text-red-300 font-bold cursor-pointer px-2"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-800 flex space-x-2">
                  <input
                    type="text"
                    placeholder="New Menu Label (e.g. Careers)"
                    value={newMenuLabel}
                    onChange={e => setNewMenuLabel(e.target.value)}
                    className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-white flex-1"
                  />
                  <input
                    type="text"
                    placeholder="Link Anchor (#careers)"
                    value={newMenuHref}
                    onChange={e => setNewMenuHref(e.target.value)}
                    className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-slate-300 font-mono w-40"
                  />
                  <button
                    onClick={() => {
                      if (!newMenuLabel.trim()) return
                      setMenuItems([...menuItems, { id: Date.now(), label: newMenuLabel.trim(), href: newMenuHref.trim() || '#' }])
                      setNewMenuLabel('')
                      setNewMenuHref('')
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl cursor-pointer"
                  >
                    + Add Option
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. HERO BANNERS SETTINGS */}
          {activeTab === 'hero' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <h2 className="font-extrabold text-sm uppercase text-blue-400">Hero Banners & Sliding Timing</h2>
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Slide Transition Interval (Milliseconds)</label>
                  <input
                    type="number"
                    value={heroSlideInterval}
                    onChange={e => setHeroSlideInterval(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <span className="font-bold text-slate-300 block uppercase text-[11px]">Active Banners ({heroBanners.length}):</span>
                  {heroBanners.map((hb, idx) => (
                    <div key={hb.id} className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="bg-blue-950 text-blue-300 px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold">{hb.tag}</span>
                        <button onClick={() => setHeroBanners(heroBanners.filter(b => b.id !== hb.id))} className="text-red-400 hover:text-red-300 font-bold cursor-pointer">Remove Banner</button>
                      </div>
                      <input
                        type="text"
                        value={hb.title}
                        onChange={e => {
                          const updated = [...heroBanners]
                          updated[idx].title = e.target.value
                          setHeroBanners(updated)
                        }}
                        className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-white font-bold uppercase"
                      />
                      <textarea
                        rows={2}
                        value={hb.subtitle}
                        onChange={e => {
                          const updated = [...heroBanners]
                          updated[idx].subtitle = e.target.value
                          setHeroBanners(updated)
                        }}
                        className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-slate-300 resize-none"
                      />
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <span className="font-bold text-blue-400 uppercase text-[11px] block">+ Add New Hero Banner</span>
                  <input type="text" placeholder="Banner Title..." value={newHeroTitle} onChange={e => setNewHeroTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-white" />
                  <input type="text" placeholder="Banner Subtitle..." value={newHeroSubtitle} onChange={e => setNewHeroSubtitle(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-white" />
                  <input type="text" placeholder="Badge Tag (e.g. INNOVATION)" value={newHeroTag} onChange={e => setNewHeroTag(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-white" />
                  <button
                    onClick={() => {
                      if (!newHeroTitle.trim()) return
                      setHeroBanners([...heroBanners, { id: Date.now(), title: newHeroTitle.trim(), subtitle: newHeroSubtitle.trim(), tag: newHeroTag.trim() || 'FEATURED' }])
                      setNewHeroTitle('')
                      setNewHeroSubtitle('')
                      setNewHeroTag('')
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl cursor-pointer"
                  >
                    Save & Add Banner
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. PRODUCTS DISPLAY SETTINGS */}
          {activeTab === 'products' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <h2 className="font-extrabold text-sm uppercase text-blue-400">Featured Products Display</h2>
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {products.map((p, idx) => (
                    <div key={p.id} className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{p.image}</span>
                        <div>
                          <h4 className="font-bold text-white uppercase">{p.name}</h4>
                          <p className="text-slate-400 text-[11px] line-clamp-1">{p.desc}</p>
                        </div>
                      </div>
                      <button onClick={() => setProducts(products.filter(item => item.id !== p.id))} className="text-red-400 hover:text-red-300 font-bold cursor-pointer">Delete</button>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 mt-4">
                  <span className="font-bold text-blue-400 uppercase text-[11px] block">+ Add Featured Product Tile</span>
                  <input type="text" placeholder="Product Name..." value={newProdName} onChange={e => setNewProdName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-white" />
                  <input type="text" placeholder="Short Description..." value={newProdDesc} onChange={e => setNewProdDesc(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-white" />
                  <input type="text" placeholder="Emoji / Image URL (e.g. ⚡)" value={newProdImage} onChange={e => setNewProdImage(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-white font-mono" />
                  <button
                    onClick={() => {
                      if (!newProdName.trim()) return
                      setProducts([...products, { id: Date.now(), name: newProdName.trim(), desc: newProdDesc.trim(), image: newProdImage.trim() || '📦' }])
                      setNewProdName('')
                      setNewProdDesc('')
                      setNewProdImage('📦')
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl cursor-pointer"
                  >
                    Add Product Tile
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 5. PARTNERS MANAGEMENT */}
          {activeTab === 'partners' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <h2 className="font-extrabold text-sm uppercase text-blue-400">Respected Partners Directory ({partners.length})</h2>
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
                  {partners.map((prt, idx) => (
                    <div key={prt.id} className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
                      <span className="font-bold text-white truncate">{prt.name}</span>
                      <button onClick={() => setPartners(partners.filter(x => x.id !== prt.id))} className="text-red-400 text-[10px] font-bold cursor-pointer">Remove</button>
                    </div>
                  ))}
                </div>

                <div className="flex space-x-2 pt-2">
                  <input
                    type="text"
                    placeholder="Partner Brand Name (e.g. Apex Corp)"
                    value={newPartnerName}
                    onChange={e => setNewPartnerName(e.target.value)}
                    className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-white flex-1"
                  />
                  <button
                    onClick={() => {
                      if (!newPartnerName.trim()) return
                      setPartners([...partners, { id: Date.now(), name: newPartnerName.trim(), logo: '🏢' }])
                      setNewPartnerName('')
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl cursor-pointer"
                  >
                    + Add Partner
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 6. BLOGS MANAGEMENT */}
          {activeTab === 'blogs' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <h2 className="font-extrabold text-sm uppercase text-blue-400">Daily Blogs Management</h2>
              <div className="space-y-3 text-xs">
                <div className="space-y-2">
                  {blogs.map((b, idx) => (
                    <div key={b.id} className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl flex justify-between items-center">
                      <div>
                        <span className="text-[10px] bg-blue-950 text-blue-300 px-2 py-0.5 rounded font-bold uppercase">{b.category}</span>
                        <h4 className="font-bold text-white text-sm mt-1">{b.title}</h4>
                        <p className="text-slate-400 text-xs">{b.desc}</p>
                      </div>
                      <button onClick={() => setBlogs(blogs.filter(item => item.id !== b.id))} className="text-red-400 hover:text-red-300 font-bold cursor-pointer shrink-0 pl-4">Delete</button>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 mt-4">
                  <span className="font-bold text-blue-400 uppercase text-[11px] block">+ Write New Blog Article</span>
                  <input type="text" placeholder="Blog Title..." value={newBlogTitle} onChange={e => setNewBlogTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-white" />
                  <input type="text" placeholder="Category (e.g. Engineering)" value={newBlogCat} onChange={e => setNewBlogCat(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-white" />
                  <textarea rows={3} placeholder="Short Blog Summary..." value={newBlogDesc} onChange={e => setNewBlogDesc(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-white resize-none" />
                  <button
                    onClick={() => {
                      if (!newBlogTitle.trim()) return
                      setBlogs([...blogs, { id: Date.now(), title: newBlogTitle.trim(), date: 'Oct 07, 2026', category: newBlogCat.trim() || 'General', desc: newBlogDesc.trim() }])
                      setNewBlogTitle('')
                      setNewBlogDesc('')
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl cursor-pointer"
                  >
                    Publish Blog Article
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 7. ABOUT US & FOOTER SETTINGS */}
          {(activeTab === 'about' || activeTab === 'footer') && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <h2 className="font-extrabold text-sm uppercase text-blue-400">About Us & Footer Configuration</h2>
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">About UNICON LABS Content</label>
                  <textarea rows={4} value={aboutText} onChange={e => setAboutText(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white resize-none leading-relaxed" />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Footer Headquarters / Contact Details</label>
                  <textarea rows={3} value={footerHQ} onChange={e => setFooterHQ(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono resize-none leading-relaxed" />
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  )
}