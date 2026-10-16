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
  const [uploading, setUploading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [isSidebarHovered, setIsSidebarHovered] = useState(false)
  const [authorized, setAuthorized] = useState(false)

  // Media Library Modal States
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false)
  const [mediaFiles, setMediaFiles] = useState<any[]>([])
  const [loadingMedia, setLoadingMedia] = useState(false)
  const [mediaSelectCallback, setMediaSelectCallback] = useState<((url: string) => void) | null>(null)

  // CMS States
  const [headerLogo, setHeaderLogo] = useState('')
  const [headerPhone, setHeaderPhone] = useState('+1 (555) 019-2834')

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
    { id: 1, title: 'POWERING AUTONOMOUS ENTERPRISE ECOSYSTEMS', subtitle: 'Next-generation multi-tenant Business OS designed for scale, speed, and real-time offline sync.', tag: 'FLAGSHIP PLATFORM', bgImage: '', textBgOpacity: 80 },
    { id: 2, title: 'INTELLIGENT POINT OF SALE & KITCHEN DISPLAY', subtitle: 'Streamline multi-tender settlement, split payments, FBR fiscal integration, and instant KOT ticket routing.', tag: 'OPERATIONAL EXCELLENCE', bgImage: '', textBgOpacity: 80 },
    { id: 3, title: 'REAL-TIME LOGISTICS & DISPATCH QUEUE', subtitle: 'Effortlessly manage delivery fleets, rider assignments, and automated customer notifications.', tag: 'SUPPLY CHAIN', bgImage: '', textBgOpacity: 80 },
  ])
  const [newHeroTitle, setNewHeroTitle] = useState('')
  const [newHeroSubtitle, setNewHeroSubtitle] = useState('')
  const [newHeroTag, setNewHeroTag] = useState('')
  const [newHeroImage, setNewHeroImage] = useState('')
  const [newHeroTextBgOpacity, setNewHeroTextBgOpacity] = useState(80)

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

  // Product Edit & Drag States
  const [editingProductId, setEditingProductId] = useState<number | null>(null)
  const [editProdName, setEditProdName] = useState('')
  const [editProdDesc, setEditProdDesc] = useState('')
  const [editProdImage, setEditProdImage] = useState('')
  const [draggedProductId, setDraggedProductId] = useState<number | null>(null)

  const [partners, setPartners] = useState(
    Array.from({ length: 18 }, (_, i) => ({ id: i + 1, name: `Partner Brand ${i + 1}`, logo: '🏢' }))
  )
  const [newPartnerName, setNewPartnerName] = useState('')
  const [newPartnerLogo, setNewPartnerLogo] = useState('')
  const [editingPartnerId, setEditingPartnerId] = useState<number | null>(null)
  const [editPartnerName, setEditPartnerName] = useState('')
  const [editPartnerLogo, setEditPartnerLogo] = useState('')

  // Blog Management States
  const [blogs, setBlogs] = useState<any[]>([])
  const [newBlogTitle, setNewBlogTitle] = useState('')
  const [newBlogCat, setNewBlogCat] = useState('Engineering')
  const [newBlogDesc, setNewBlogDesc] = useState('')
  const [newBlogImage, setNewBlogImage] = useState('')
  const [newBlogWriter, setNewBlogWriter] = useState('')
  const [newBlogPostType, setNewBlogPostType] = useState<'now' | 'schedule'>('now')
  const [newBlogScheduleDate, setNewBlogScheduleDate] = useState('')

  // Blog Edit States
  const [editingBlogId, setEditingBlogId] = useState<number | null>(null)
  const [editBlogTitle, setEditBlogTitle] = useState('')
  const [editBlogCat, setEditBlogCat] = useState('')
  const [editBlogDesc, setEditBlogDesc] = useState('')
  const [editBlogImage, setEditBlogImage] = useState('')
  const [editBlogWriter, setEditBlogWriter] = useState('')
  const [editBlogPostType, setEditBlogPostType] = useState<'now' | 'schedule'>('now')
  const [editBlogScheduleDate, setEditBlogScheduleDate] = useState('')

  const [aboutText, setAboutText] = useState('Founded with a vision to revolutionize enterprise operations, Unicon Labs specializes in building end-to-end digital ecosystems. From multi-tenant POS hardware integrations to cloud synchronization and automated financial auditing, we provide the infrastructure businesses need to thrive.')
  const [footerHQ, setFooterHQ] = useState('Software Development Enterprise\nDigital Ecosystems & Modules\nEmail: care.uniconlabs@gmail.com')

  // Load existing settings and verify authorization from sessionStorage on mount
  useEffect(() => {
    async function verifyAndFetch() {
      const sessionAuth = sessionStorage.getItem('unicon_master_auth')
      
      if (sessionAuth !== 'true') {
        router.push('/master-admin')
        return
      }

      setAuthorized(true)

      const { data, error } = await supabase
        .from('unicon_global_settings')
        .select('settings')
        .eq('id', 'main')
        .maybeSingle()

      if (!error && data && data.settings) {
        const s = data.settings
        if (s.headerLogo) setHeaderLogo(s.headerLogo)
        if (s.headerPhone) setHeaderPhone(s.headerPhone)
        if (s.menuItems) setMenuItems(s.menuItems)
        if (s.heroSlideInterval) setHeroSlideInterval(s.heroSlideInterval)
        if (s.heroBanners) setHeroBanners(s.heroBanners)
        if (s.products) setProducts(s.products)
        if (s.partners) setPartners(s.partners)
        if (s.blogs !== undefined) setBlogs(s.blogs)
        if (s.aboutText) setAboutText(s.aboutText)
        if (s.footerHQ) setFooterHQ(s.footerHQ)
      }
      setLoadingData(false)
    }
    verifyAndFetch()
  }, [router])

  // Helper: Extract storage file path from public URL and delete it from Supabase bucket
  const deleteFileFromSupabaseStorage = async (fileUrl: string) => {
    if (!fileUrl || !fileUrl.includes('/unicon-media/')) return
    try {
      const urlParts = fileUrl.split('/unicon-media/')
      if (urlParts.length > 1) {
        const filePath = decodeURIComponent(urlParts[1])
        await supabase.storage.from('unicon-media').remove([filePath])
      }
    } catch (err) {
      console.error('Failed to delete old file from bucket:', err)
    }
  }

  // Centralized Supabase Storage Upload Helper
  const uploadFileToSupabaseStorage = async (file: File): Promise<string | null> => {
    try {
      setUploading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `uploads/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('unicon-media')
        .upload(filePath, file)

      if (uploadError) {
        alert(`Storage Upload Failed: ${uploadError.message}`)
        return null
      }

      const { data: { publicUrl } } = supabase.storage
        .from('unicon-media')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (err: any) {
      console.error('Upload Error:', err)
      alert('An error occurred during file upload.')
      return null
    } finally {
      setUploading(false)
    }
  }

  // Fetch existing images from Supabase storage bucket
  const fetchSupabaseMediaLibrary = async () => {
    setLoadingMedia(true)
    try {
      const { data, error } = await supabase.storage.from('unicon-media').list('uploads', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      })
      if (!error && data) {
        const formatted = data
          .filter(item => item.name && item.name !== '.emptyFolderPlaceholder')
          .map(item => {
            const filePath = `uploads/${item.name}`
            const { data: { publicUrl } } = supabase.storage.from('unicon-media').getPublicUrl(filePath)
            return {
              name: item.name,
              url: publicUrl,
              created_at: item.created_at
            }
          })
        setMediaFiles(formatted)
      }
    } catch (err) {
      console.error('Error fetching media library:', err)
    } finally {
      setLoadingMedia(false)
    }
  }

  const openMediaPicker = (callback: (url: string) => void) => {
    setMediaSelectCallback(() => callback)
    setIsMediaModalOpen(true)
    fetchSupabaseMediaLibrary()
  }

  const handleSaveChanges = async () => {
    setSaving(true)
    const payload = {
      headerLogo,
      headerPhone,
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

  // Product Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedProductId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault()
    if (draggedProductId === null || draggedProductId === targetId) return

    const updatedProducts = [...products]
    const draggedIndex = updatedProducts.findIndex(p => p.id === draggedProductId)
    const targetIndex = updatedProducts.findIndex(p => p.id === targetId)

    if (draggedIndex < 0 || targetIndex < 0) return

    const [removed] = updatedProducts.splice(draggedIndex, 1)
    updatedProducts.splice(targetIndex, 0, removed)

    setProducts(updatedProducts)
    setDraggedProductId(null)
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

  if (loadingData || !authorized) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center font-bold text-white">Verifying Security & Loading CMS Settings...</div>
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none relative">
      
      {/* Uploading Progress Overlay */}
      {uploading && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center">
          <div className="bg-slate-900 border border-blue-500/50 p-6 rounded-2xl flex items-center space-x-3 shadow-2xl">
            <span className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
            <span className="text-sm font-bold text-blue-300 uppercase">Synchronizing bucket storage...</span>
          </div>
        </div>
      )}

      {/* Media Library Picker Modal */}
      {isMediaModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl p-6 space-y-4 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-sm uppercase text-blue-400">Media Library & Storage Bucket</h3>
                <p className="text-[10px] text-slate-400">Choose an existing image to reuse across your website, or upload a brand new file.</p>
              </div>
              <button onClick={() => setIsMediaModalOpen(false)} className="text-slate-400 hover:text-white font-bold cursor-pointer text-xs">✕ Close</button>
            </div>

            {/* Direct Upload Tab inside Modal */}
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
              <span className="text-xs text-slate-300 font-bold">Upload New Image to Bucket:</span>
              <input
                type="file"
                accept="image/*"
                onChange={async e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const publicUrl = await uploadFileToSupabaseStorage(file)
                  if (publicUrl) {
                    if (mediaSelectCallback) mediaSelectCallback(publicUrl)
                    setIsMediaModalOpen(false)
                  }
                }}
                className="text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-blue-600 file:text-white cursor-pointer"
              />
            </div>

            {/* Existing Images Grid */}
            <div className="flex-1 overflow-y-auto pr-1">
              {loadingMedia ? (
                <div className="text-center py-10 text-xs text-slate-400 font-bold">Loading available storage images...</div>
              ) : mediaFiles.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-500">No images found in Supabase storage bucket.</div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {mediaFiles.map((file, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        if (mediaSelectCallback) mediaSelectCallback(file.url)
                        setIsMediaModalOpen(false)
                      }}
                      className="group relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden aspect-square cursor-pointer hover:border-blue-500 transition flex items-center justify-center"
                    >
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-200" />
                      <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition flex items-end p-2">
                        <span className="text-[9px] bg-slate-950/90 text-white px-1.5 py-0.5 rounded font-bold truncate w-full text-center">Select Image</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <header className="px-8 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/80 sticky top-0 z-40 shadow-sm">
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
          className={`bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out flex flex-col shrink-0 z-30 ${
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
              <h2 className="font-extrabold text-sm uppercase text-blue-400">Header Branding & Inquiry Contact</h2>
              <div className="space-y-4 text-xs">
                
                {/* UNICON LABS Brand Logo Section */}
                <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <label className="block text-slate-400 font-bold uppercase text-[10px]">UNICON LABS Brand Logo Image</label>
                  <div className="flex items-center space-x-3">
                    {headerLogo ? (
                      <div className="w-16 h-12 bg-slate-900 rounded-lg border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center p-1">
                        <img src={headerLogo} alt="Brand Logo" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-16 h-12 bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-center text-[10px] text-slate-500 font-bold">No Logo</div>
                    )}
                    <div className="flex-1 space-y-2">
                      <button
                        type="button"
                        onClick={() => openMediaPicker(async (url) => {
                          if (headerLogo && headerLogo !== url) await deleteFileFromSupabaseStorage(headerLogo)
                          setHeaderLogo(url)
                        })}
                        className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[10px] uppercase cursor-pointer shadow"
                      >
                        📁 Choose from Media Library / Upload
                      </button>
                      <input
                        type="text"
                        placeholder="Or paste direct image URL..."
                        value={headerLogo}
                        onChange={e => setHeaderLogo(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300 font-mono text-xs"
                      />
                    </div>
                    {headerLogo && (
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteFileFromSupabaseStorage(headerLogo)
                          setHeaderLogo('')
                        }}
                        className="text-red-400 hover:text-red-300 font-bold text-xs cursor-pointer px-2"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Immediate Inquiry Phone Number Section */}
                <div className="space-y-1 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <label className="block text-slate-400 font-bold uppercase text-[10px]">Immediate Inquiry Phone Number</label>
                  <p className="text-[10px] text-slate-500 mb-2">Shown alongside: <span className="text-slate-300 font-mono">"For immediate inquiry please call (9:00 AM - 6:00 PM / Mon - Sat)"</span></p>
                  <input
                    type="text"
                    placeholder="Enter phone number (e.g. +1 (555) 019-2834)"
                    value={headerPhone}
                    onChange={e => setHeaderPhone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-white font-mono"
                  />
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
              <h2 className="font-extrabold text-sm uppercase text-blue-400">Hero Banners, Visuals & Sliding Timing</h2>
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
                    <div key={hb.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="bg-blue-950 text-blue-300 px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold">{hb.tag}</span>
                        <button 
                          onClick={async () => {
                            if (hb.bgImage) await deleteFileFromSupabaseStorage(hb.bgImage)
                            setHeroBanners(heroBanners.filter(b => b.id !== hb.id))
                          }} 
                          className="text-red-400 hover:text-red-300 font-bold cursor-pointer"
                        >
                          Remove Banner
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={hb.title}
                            onChange={e => {
                              const updated = [...heroBanners]
                              updated[idx].title = e.target.value
                              setHeroBanners(updated)
                            }}
                            className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-white font-bold uppercase text-xs"
                            placeholder="Banner Title"
                          />
                          <textarea
                            rows={2}
                            value={hb.subtitle}
                            onChange={e => {
                              const updated = [...heroBanners]
                              updated[idx].subtitle = e.target.value
                              setHeroBanners(updated)
                            }}
                            className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-slate-300 resize-none text-xs"
                            placeholder="Banner Subtitle"
                          />
                          <div className="space-y-1 bg-slate-900 p-3 rounded-lg border border-slate-800">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-400 uppercase text-[10px]">Text Background Transparency</span>
                              <span className="font-mono text-xs text-blue-400 font-bold">{hb.textBgOpacity ?? 80}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={hb.textBgOpacity ?? 80}
                              onChange={e => {
                                const updated = [...heroBanners]
                                updated[idx].textBgOpacity = Number(e.target.value)
                                setHeroBanners(updated)
                              }}
                              className="w-full accent-blue-600 cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="space-y-2 bg-slate-900 p-3 rounded-lg border border-slate-800">
                          <span className="font-bold text-slate-400 uppercase text-[10px] block">Banner Background Image</span>
                          <div className="flex items-center space-x-2">
                            {hb.bgImage ? (
                              <div className="w-12 h-10 bg-slate-950 rounded border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                                <img src={hb.bgImage} alt="" className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-12 h-10 bg-slate-950 rounded border border-slate-700 flex items-center justify-center text-xs text-slate-500">None</div>
                            )}
                            <button
                              type="button"
                              onClick={() => openMediaPicker(async (url) => {
                                const oldUrl = heroBanners[idx]?.bgImage
                                if (oldUrl && oldUrl !== url) await deleteFileFromSupabaseStorage(oldUrl)
                                const updated = [...heroBanners]
                                updated[idx].bgImage = url
                                setHeroBanners(updated)
                              })}
                              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[10px] uppercase cursor-pointer text-center shadow"
                            >
                              📁 Choose / Upload Image
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Or paste image URL..."
                            value={hb.bgImage || ''}
                            onChange={async e => {
                              const updated = [...heroBanners]
                              updated[idx].bgImage = e.target.value
                              setHeroBanners(updated)
                            }}
                            className="w-full bg-slate-950 border border-slate-800 px-2 py-1 rounded text-[11px] font-mono text-slate-300"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <span className="font-bold text-blue-400 uppercase text-[11px] block">+ Add New Hero Banner</span>
                  <input type="text" placeholder="Banner Title..." value={newHeroTitle} onChange={e => setNewHeroTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-white" />
                  <input type="text" placeholder="Banner Subtitle..." value={newHeroSubtitle} onChange={e => setNewHeroSubtitle(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-white" />
                  <input type="text" placeholder="Badge Tag (e.g. INNOVATION)" value={newHeroTag} onChange={e => setNewHeroTag(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-white" />
                  
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">Text Background Transparency</label>
                      <span className="font-mono text-xs text-blue-400 font-bold">{newHeroTextBgOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={newHeroTextBgOpacity}
                      onChange={e => setNewHeroTextBgOpacity(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Banner Image (Choose from Media Library or URL)</label>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => openMediaPicker(async (url) => {
                          if (newHeroImage && newHeroImage !== url) await deleteFileFromSupabaseStorage(newHeroImage)
                          setNewHeroImage(url)
                        })}
                        className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[10px] uppercase cursor-pointer shadow"
                      >
                        📁 Choose / Upload Image
                      </button>
                    </div>
                    <input type="text" placeholder="Or paste image URL..." value={newHeroImage} onChange={e => setNewHeroImage(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs font-mono text-white" />
                  </div>

                  <button
                    onClick={() => {
                      if (!newHeroTitle.trim()) return
                      setHeroBanners([...heroBanners, { id: Date.now(), title: newHeroTitle.trim(), subtitle: newHeroSubtitle.trim(), tag: newHeroTag.trim() || 'FEATURED', bgImage: newHeroImage.trim(), textBgOpacity: newHeroTextBgOpacity }])
                      setNewHeroTitle('')
                      setNewHeroSubtitle('')
                      setNewHeroTag('')
                      setNewHeroImage('')
                      setNewHeroTextBgOpacity(80)
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
              <div className="flex justify-between items-center">
                <h2 className="font-extrabold text-sm uppercase text-blue-400">Featured Products Display</h2>
                <span className="text-[10px] text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">💡 Drag and drop ⠿ to reorder products permanently</span>
              </div>
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {products.map((p) => (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={e => handleDragStart(e, p.id)}
                      onDragOver={handleDragOver}
                      onDrop={e => handleDrop(e, p.id)}
                      className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between cursor-grab active:cursor-grabbing hover:border-blue-500/50 transition"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-slate-500 font-mono text-sm select-none">⠿</span>
                        {p.image && (p.image.startsWith('http') || p.image.startsWith('/') || p.image.startsWith('data:')) ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-800 shrink-0 bg-slate-900 flex items-center justify-center">
                            <img src={p.image} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <span className="text-2xl shrink-0">{p.image || '📦'}</span>
                        )}
                        <div>
                          <h4 className="font-bold text-white uppercase">{p.name}</h4>
                          <p className="text-slate-400 text-[11px] line-clamp-1">{p.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => {
                            setEditingProductId(p.id)
                            setEditProdName(p.name)
                            setEditProdDesc(p.desc)
                            setEditProdImage(p.image)
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-300 font-bold rounded-lg cursor-pointer text-[11px]"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={async () => {
                            if (p.image && !['📦', '🖥️', '🍳', '📊', '🛍️'].includes(p.image)) {
                              await deleteFileFromSupabaseStorage(p.image)
                            }
                            setProducts(products.filter(item => item.id !== p.id))
                          }} 
                          className="text-red-400 hover:text-red-300 font-bold cursor-pointer text-[11px]"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Edit Product Section */}
                {editingProductId !== null && (
                  <div className="p-4 bg-blue-950/30 border border-blue-800/60 rounded-xl space-y-3 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-blue-400 uppercase text-[11px]">✏️ Edit Product ID #{editingProductId}</span>
                      <button onClick={() => setEditingProductId(null)} className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer">Cancel</button>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Product Name</label>
                        <input type="text" value={editProdName} onChange={e => setEditProdName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-white" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Short Description</label>
                        <input type="text" value={editProdDesc} onChange={e => setEditProdDesc(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Product Image (Media Library, URL, or Emoji)</label>
                        <div className="flex items-center space-x-2">
                          {editProdImage && (editProdImage.startsWith('http') || editProdImage.startsWith('/') || editProdImage.startsWith('data:')) ? (
                            <div className="w-12 h-10 rounded border border-slate-700 overflow-hidden shrink-0 bg-slate-900 flex items-center justify-center">
                              <img src={editProdImage} alt="" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-12 h-10 rounded border border-slate-700 flex items-center justify-center text-lg bg-slate-900 shrink-0">{editProdImage || '📦'}</div>
                          )}
                          <button
                            type="button"
                            onClick={() => openMediaPicker(async (url) => {
                              if (editProdImage && !['📦', '🖥️', '🍳', '📊', '🛍️'].includes(editProdImage) && editProdImage !== url) {
                                await deleteFileFromSupabaseStorage(editProdImage)
                              }
                              setEditProdImage(url)
                            })}
                            className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[10px] uppercase cursor-pointer shadow"
                          >
                            📁 Choose / Upload Image
                          </button>
                        </div>
                        <input type="text" placeholder="Or paste image URL / Emoji..." value={editProdImage} onChange={e => setEditProdImage(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs font-mono text-white" />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (!editProdName.trim()) return
                        setProducts(products.map(p => p.id === editingProductId ? { ...p, name: editProdName.trim(), desc: editProdDesc.trim(), image: editProdImage.trim() || '📦' } : p))
                        setEditingProductId(null)
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl cursor-pointer"
                    >
                      Update Product Tile
                    </button>
                  </div>
                )}

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 mt-4">
                  <span className="font-bold text-blue-400 uppercase text-[11px] block">+ Add Featured Product Tile</span>
                  <input type="text" placeholder="Product Name..." value={newProdName} onChange={e => setNewProdName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-white" />
                  <input type="text" placeholder="Short Description..." value={newProdDesc} onChange={e => setNewProdDesc(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-white" />
                  
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Product Image (Media Library, URL, or Emoji)</label>
                    <div className="flex items-center space-x-2">
                      {newProdImage && (newProdImage.startsWith('http') || newProdImage.startsWith('/') || newProdImage.startsWith('data:')) ? (
                        <div className="w-12 h-10 rounded border border-slate-700 overflow-hidden shrink-0 bg-slate-900 flex items-center justify-center">
                          <img src={newProdImage} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-10 rounded border border-slate-700 flex items-center justify-center text-lg bg-slate-900 shrink-0">{newProdImage || '📦'}</div>
                      )}
                      <button
                        type="button"
                        onClick={() => openMediaPicker(async (url) => {
                          if (newProdImage && !['📦', '🖥️', '🍳', '📊', '🛍️'].includes(newProdImage) && newProdImage !== url) {
                            await deleteFileFromSupabaseStorage(newProdImage)
                          }
                          setNewProdImage(url)
                        })}
                        className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[10px] uppercase cursor-pointer shadow"
                      >
                        📁 Choose / Upload Image
                      </button>
                    </div>
                    <input type="text" placeholder="Or paste image URL / Emoji..." value={newProdImage} onChange={e => setNewProdImage(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs font-mono text-white" />
                  </div>

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                  {partners.map((prt: any) => (
                    <div key={prt.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {prt.logo && (prt.logo.startsWith('http') || prt.logo.startsWith('/') || prt.logo.startsWith('data:')) ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-800 shrink-0 bg-slate-900 flex items-center justify-center">
                            <img src={prt.logo} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <span className="text-2xl shrink-0">{prt.logo || '🏢'}</span>
                        )}
                        <div>
                          <h4 className="font-bold text-white uppercase">{prt.name}</h4>
                          <span className="text-[10px] text-slate-500 font-mono">Partner ID #{prt.id}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => {
                            setEditingPartnerId(prt.id)
                            setEditPartnerName(prt.name)
                            setEditPartnerLogo(prt.logo || '🏢')
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-300 font-bold rounded-lg cursor-pointer text-[11px]"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={async () => {
                            if (prt.logo && prt.logo !== '🏢') await deleteFileFromSupabaseStorage(prt.logo)
                            setPartners(partners.filter((x: any) => x.id !== prt.id))
                          }} 
                          className="text-red-400 hover:text-red-300 font-bold cursor-pointer text-[11px]"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Edit Partner Section */}
                {editingPartnerId !== null && (
                  <div className="p-4 bg-blue-950/30 border border-blue-800/60 rounded-xl space-y-3 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-blue-400 uppercase text-[11px]">✏️ Edit Partner ID #{editingPartnerId}</span>
                      <button onClick={() => setEditingPartnerId(null)} className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer">Cancel</button>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Partner Brand Name</label>
                        <input type="text" value={editPartnerName} onChange={e => setEditPartnerName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-white" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Partner Brand Logo (Media Library, URL, or Emoji)</label>
                        <div className="flex items-center space-x-2">
                          {editPartnerLogo && (editPartnerLogo.startsWith('http') || editPartnerLogo.startsWith('/') || editPartnerLogo.startsWith('data:')) ? (
                            <div className="w-12 h-10 rounded border border-slate-700 overflow-hidden shrink-0 bg-slate-900 flex items-center justify-center">
                              <img src={editPartnerLogo} alt="" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-12 h-10 rounded border border-slate-700 flex items-center justify-center text-lg bg-slate-900 shrink-0">{editPartnerLogo || '🏢'}</div>
                          )}
                          <button
                            type="button"
                            onClick={() => openMediaPicker(async (url) => {
                              if (editPartnerLogo && editPartnerLogo !== '🏢' && editPartnerLogo !== url) {
                                await deleteFileFromSupabaseStorage(editPartnerLogo)
                              }
                              setEditPartnerLogo(url)
                            })}
                            className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[10px] uppercase cursor-pointer shadow"
                          >
                            📁 Choose / Upload Logo
                          </button>
                        </div>
                        <input type="text" placeholder="Or paste image URL / Emoji..." value={editPartnerLogo} onChange={e => setEditPartnerLogo(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs font-mono text-white" />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (!editPartnerName.trim()) return
                        setPartners(partners.map((p: any) => p.id === editingPartnerId ? { ...p, name: editPartnerName.trim(), logo: editPartnerLogo.trim() || '🏢' } : p))
                        setEditingPartnerId(null)
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl cursor-pointer"
                    >
                      Update Partner Entry
                    </button>
                  </div>
                )}

                {/* Add New Partner Section */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 mt-4">
                  <span className="font-bold text-blue-400 uppercase text-[11px] block">+ Add Respected Partner Brand</span>
                  <input
                    type="text"
                    placeholder="Partner Brand Name (e.g. Apex Corp)"
                    value={newPartnerName}
                    onChange={e => setNewPartnerName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-white"
                  />

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Partner Brand Logo (Media Library, URL, or Emoji)</label>
                    <div className="flex items-center space-x-2">
                      {newPartnerLogo && (newPartnerLogo.startsWith('http') || newPartnerLogo.startsWith('/') || newPartnerLogo.startsWith('data:')) ? (
                        <div className="w-12 h-10 rounded border border-slate-700 overflow-hidden shrink-0 bg-slate-900 flex items-center justify-center">
                          <img src={newPartnerLogo} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-10 rounded border border-slate-700 flex items-center justify-center text-lg bg-slate-900 shrink-0">{newPartnerLogo || '🏢'}</div>
                      )}
                      <button
                        type="button"
                        onClick={() => openMediaPicker(async (url) => {
                          if (newPartnerLogo && newPartnerLogo !== '🏢' && newPartnerLogo !== url) {
                            await deleteFileFromSupabaseStorage(newPartnerLogo)
                          }
                          setNewPartnerLogo(url)
                        })}
                        className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[10px] uppercase cursor-pointer shadow"
                      >
                        📁 Choose / Upload Logo
                      </button>
                    </div>
                    <input type="text" placeholder="Or paste image URL / Emoji..." value={newPartnerLogo} onChange={e => setNewPartnerLogo(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs font-mono text-white" />
                  </div>

                  <button
                    onClick={() => {
                      if (!newPartnerName.trim()) return
                      setPartners([...partners, { id: Date.now(), name: newPartnerName.trim(), logo: newPartnerLogo.trim() || '🏢' }])
                      setNewPartnerName('')
                      setNewPartnerLogo('🏢')
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl cursor-pointer"
                  >
                    + Add Partner Entry
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
                {blogs.length === 0 ? (
                  <div className="text-slate-400 text-xs py-4 italic">No blogs currently added. Use the form below to create one.</div>
                ) : (
                  <div className="space-y-2">
                    {blogs.map((b: any) => (
                      <div key={b.id} className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl flex justify-between items-start space-x-3">
                        <div className="flex space-x-3 items-start flex-1">
                          {b.image && (b.image.startsWith('http') || b.image.startsWith('/') || b.image.startsWith('data:')) ? (
                            <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-800 shrink-0 bg-slate-900 flex items-center justify-center mt-1">
                              <img src={b.image} alt="" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-14 h-14 rounded-lg border border-slate-800 flex items-center justify-center text-xl bg-slate-900 shrink-0 mt-1">📰</div>
                          )}
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] bg-blue-950 text-blue-300 px-2 py-0.5 rounded font-bold uppercase">{b.category}</span>
                              <span className="text-[10px] text-slate-500 font-mono">📅 {b.date} {b.postType === 'schedule' && b.scheduleDate ? `(Scheduled: ${b.scheduleDate})` : ''}</span>
                            </div>
                            <h4 className="font-bold text-white text-sm">{b.title}</h4>
                            <p className="text-slate-400 text-xs text-justify leading-relaxed">{b.desc}</p>
                            {b.writer && (
                              <p className="text-[11px] text-blue-400 font-medium italic pt-0.5">Shared by: {b.writer}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0 pt-1">
                          <button
                            onClick={() => {
                              setEditingBlogId(b.id)
                              setEditBlogTitle(b.title)
                              setEditBlogCat(b.category || 'General')
                              setEditBlogDesc(b.desc)
                              setEditBlogImage(b.image || '')
                              setEditBlogWriter(b.writer || '')
                              setEditBlogPostType(b.postType || 'now')
                              setEditBlogScheduleDate(b.scheduleDate || '')
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-300 font-bold rounded-lg cursor-pointer text-[11px]"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={async () => {
                              if (b.image) await deleteFileFromSupabaseStorage(b.image)
                              setBlogs(blogs.filter((item: any) => item.id !== b.id))
                            }} 
                            className="text-red-400 hover:text-red-300 font-bold cursor-pointer text-[11px]"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Edit Blog Section */}
                {editingBlogId !== null && (
                  <div className="p-4 bg-blue-950/30 border border-blue-800/60 rounded-xl space-y-3 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-blue-400 uppercase text-[11px]">✏️ Edit Blog Article ID #{editingBlogId}</span>
                      <button onClick={() => setEditingBlogId(null)} className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer">Cancel</button>
                    </div>
                    <div className="space-y-2">
                      <input type="text" placeholder="Blog Title..." value={editBlogTitle} onChange={e => setEditBlogTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-white" />
                      <input type="text" placeholder="Category (e.g. Engineering)" value={editBlogCat} onChange={e => setEditBlogCat(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-white" />
                      <textarea rows={3} placeholder="Short Blog Summary..." value={editBlogDesc} onChange={e => setEditBlogDesc(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-white resize-none" />
                      <input type="text" placeholder="Writer Name / Designation (e.g. John Doe, Lead Architect)..." value={editBlogWriter} onChange={e => setEditBlogWriter(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-white" />

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Blog Image (Media Library or URL)</label>
                        <div className="flex items-center space-x-2">
                          {editBlogImage && (editBlogImage.startsWith('http') || editBlogImage.startsWith('/') || editBlogImage.startsWith('data:')) ? (
                            <div className="w-12 h-10 rounded border border-slate-700 overflow-hidden shrink-0 bg-slate-900 flex items-center justify-center">
                              <img src={editBlogImage} alt="" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-12 h-10 rounded border border-slate-700 flex items-center justify-center text-lg bg-slate-900 shrink-0">📰</div>
                          )}
                          <button
                            type="button"
                            onClick={() => openMediaPicker(async (url) => {
                              if (editBlogImage && editBlogImage !== url) await deleteFileFromSupabaseStorage(editBlogImage)
                              setEditBlogImage(url)
                            })}
                            className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[10px] uppercase cursor-pointer shadow"
                          >
                            📁 Choose / Upload Image
                          </button>
                        </div>
                        <input type="text" placeholder="Or paste image URL..." value={editBlogImage} onChange={e => setEditBlogImage(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs font-mono text-white" />
                      </div>

                      <div className="space-y-1 pt-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Posting Schedule Option</label>
                        <div className="flex space-x-4">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="editBlogType" checked={editBlogPostType === 'now'} onChange={() => setEditBlogPostType('now')} className="accent-blue-600" />
                            <span className="text-white font-medium">Post Now</span>
                          </label>
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="editBlogType" checked={editBlogPostType === 'schedule'} onChange={() => setEditBlogPostType('schedule')} className="accent-blue-600" />
                            <span className="text-white font-medium">Set Posting Date/Time</span>
                          </label>
                        </div>
                        {editBlogPostType === 'schedule' && (
                          <input type="datetime-local" value={editBlogScheduleDate} onChange={e => setEditBlogScheduleDate(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-white font-mono text-xs mt-1" />
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (!editBlogTitle.trim()) return
                        setBlogs(blogs.map((b: any) => b.id === editingBlogId ? { ...b, title: editBlogTitle.trim(), category: editBlogCat.trim() || 'General', desc: editBlogDesc.trim(), image: editBlogImage.trim(), writer: editBlogWriter.trim(), postType: editBlogPostType, scheduleDate: editBlogScheduleDate } : b))
                        setEditingBlogId(null)
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl cursor-pointer"
                    >
                      Update Blog Article
                    </button>
                  </div>
                )}

                {/* Add New Blog Section */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 mt-4">
                  <span className="font-bold text-blue-400 uppercase text-[11px] block">+ Write New Blog Article</span>
                  <input type="text" placeholder="Blog Title..." value={newBlogTitle} onChange={e => setNewBlogTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-white" />
                  <input type="text" placeholder="Category (e.g. Engineering)" value={newBlogCat} onChange={e => setNewBlogCat(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-white" />
                  <textarea rows={3} placeholder="Short Blog Summary..." value={newBlogDesc} onChange={e => setNewBlogDesc(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-white resize-none" />
                  <input type="text" placeholder="Writer Name / Designation (e.g. John Doe, Lead Architect)..." value={newBlogWriter} onChange={e => setNewBlogWriter(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-white" />

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Blog Image (Media Library or URL)</label>
                    <div className="flex items-center space-x-2">
                      {newBlogImage && (newBlogImage.startsWith('http') || newBlogImage.startsWith('/') || newBlogImage.startsWith('data:')) ? (
                        <div className="w-12 h-10 rounded border border-slate-700 overflow-hidden shrink-0 bg-slate-900 flex items-center justify-center">
                          <img src={newBlogImage} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-10 rounded border border-slate-700 flex items-center justify-center text-lg bg-slate-900 shrink-0">📰</div>
                      )}
                      <button
                        type="button"
                        onClick={() => openMediaPicker(async (url) => {
                          if (newBlogImage && newBlogImage !== url) await deleteFileFromSupabaseStorage(newBlogImage)
                          setNewBlogImage(url)
                        })}
                        className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[10px] uppercase cursor-pointer shadow"
                      >
                        📁 Choose / Upload Image
                      </button>
                    </div>
                    <input type="text" placeholder="Or paste image URL..." value={newBlogImage} onChange={e => setNewBlogImage(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs font-mono text-white" />
                  </div>

                  <div className="space-y-1 pt-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Posting Schedule Option</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="radio" name="newBlogType" checked={newBlogPostType === 'now'} onChange={() => setNewBlogPostType('now')} className="accent-blue-600" />
                        <span className="text-white font-medium">Post Now</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="radio" name="newBlogType" checked={newBlogPostType === 'schedule'} onChange={() => setNewBlogPostType('schedule')} className="accent-blue-600" />
                        <span className="text-white font-medium">Set Posting Date/Time</span>
                      </label>
                    </div>
                    {newBlogPostType === 'schedule' && (
                      <input type="datetime-local" value={newBlogScheduleDate} onChange={e => setNewBlogScheduleDate(e.target.value)} className="w-full bg-slate-900 border border-slate-700 px-3 py-2 text-white font-mono text-xs mt-1" />
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (!newBlogTitle.trim()) return
                      setBlogs(prevBlogs => [
                        ...prevBlogs,
                        {
                          id: Date.now(),
                          title: newBlogTitle.trim(),
                          date: 'Oct 15, 2026',
                          category: newBlogCat.trim() || 'General',
                          desc: newBlogDesc.trim(),
                          image: newBlogImage.trim(),
                          writer: newBlogWriter.trim(),
                          postType: newBlogPostType,
                          scheduleDate: newBlogScheduleDate
                        }
                      ])
                      setNewBlogTitle('')
                      setNewBlogCat('Engineering')
                      setNewBlogDesc('')
                      setNewBlogImage('')
                      setNewBlogWriter('')
                      setNewBlogPostType('now')
                      setNewBlogScheduleDate('')
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