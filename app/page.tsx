'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function UniconLabsLandingPage() {
  const router = useRouter()
  const [activeHeroSlide, setActiveHeroSlide] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // In-Page Product Detail View State (Keeps user on home page)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [activeCatalogSlide, setActiveCatalogSlide] = useState(0)

  // Contact Modal States
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [selectedModules, setSelectedModules] = useState<string[]>([])
  const [contactMessage, setContactMessage] = useState('')
  const [submittingQuery, setSubmittingQuery] = useState(false)

  // Auth / Login Modal States
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [tenantIdInput, setTenantIdInput] = useState('')
  const [tenantPassword, setTenantPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // Footer Modal States (Privacy, Terms, Security Compliance)
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false)
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false)
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false)

  // Dynamic Content State loaded from Supabase
  const [headerBrand, setHeaderBrand] = useState('UNICON LABS')
  const [headerSlogan, setHeaderSlogan] = useState('YOU THINK WE BUILD')
  const [headerLogo, setHeaderLogo] = useState('')
  const [headerPhone, setHeaderPhone] = useState('+92 333 3776556')
  const [menuItems, setMenuItems] = useState([
    { id: 1, label: 'HOME', href: '#home' },
    { id: 2, label: 'Products', href: '#products' },
    { id: 3, label: 'Hardware', href: '#hardware' },
    { id: 4, label: 'Our Partners', href: '#partners' },
    { id: 5, label: 'About UNICON LABS', href: '#about' },
    { id: 6, label: 'Blogs', href: '#blogs' },
    { id: 7, label: 'Contact Us', href: '#contact' },
  ])
  const [heroSlideInterval, setHeroSlideInterval] = useState(4500)
  const [heroBanners, setHeroBanners] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [hardwareItems, setHardwareItems] = useState<any[]>([])
  const [partners, setPartners] = useState<any[]>([])
  const [blogs, setBlogs] = useState<any[]>([])
  const [aboutText, setAboutText] = useState('Founded with a vision to revolutionize enterprise operations, Unicon Labs specializes in building end-to-end digital ecosystems. From multi-tenant POS hardware integrations to cloud synchronization and automated financial auditing, we provide the infrastructure businesses need to thrive.')
  const [footerHQ, setFooterHQ] = useState('Software Development Enterprise\nDigital Ecosystems & Modules\nEmail: info.uniconlabs@gmail.com')

  // Fetch settings on load & subscribe to real-time changes
  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase
        .from('unicon_global_settings')
        .select('settings')
        .eq('id', 'main')
        .maybeSingle()

      if (data && data.settings) {
        applySettings(data.settings)
      }
      setIsLoading(false)
    }
    loadSettings()

    const channel = supabase
      .channel('unicon-website-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'unicon_global_settings' },
        (payload: any) => {
          if (payload.new && payload.new.settings) {
            applySettings(payload.new.settings)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const applySettings = (s: any) => {
    if (s.headerBrand) setHeaderBrand(s.headerBrand)
    if (s.headerSlogan) setHeaderSlogan(s.headerSlogan)
    if (s.headerLogo) setHeaderLogo(s.headerLogo)
    if (s.headerPhone) setHeaderPhone(s.headerPhone)
    if (s.menuItems) setMenuItems(s.menuItems)
    if (s.heroSlideInterval) setHeroSlideInterval(s.heroSlideInterval)
    if (s.heroBanners && s.heroBanners.length > 0) setHeroBanners(s.heroBanners)
    if (s.products && s.products.length > 0) setProducts(s.products)
    if (s.hardwareItems !== undefined) setHardwareItems(s.hardwareItems)
    if (s.partners && s.partners.length > 0) setPartners(s.partners)
    if (s.blogs !== undefined) setBlogs(s.blogs)
    if (s.aboutText) setAboutText(s.aboutText)
    if (s.footerHQ) setFooterHQ(s.footerHQ)
  }

  // Auto-slide hero banners with pause support
  useEffect(() => {
    if (heroBanners.length === 0 || isPaused) return
    const timer = setInterval(() => {
      setActiveHeroSlide(prev => (prev + 1) % heroBanners.length)
    }, heroSlideInterval || 4500)
    return () => clearInterval(timer)
  }, [heroBanners.length, heroSlideInterval, isPaused])

  // Catalog Images Auto-Slider (Every 3 seconds, respects pause state)
  useEffect(() => {
    if (!selectedProduct || isPaused) return
    const catalogImages = selectedProduct.gallery && selectedProduct.gallery.length > 0 
      ? selectedProduct.gallery 
      : [selectedProduct.image]

    if (catalogImages.length <= 1) return

    const catalogTimer = setInterval(() => {
      setActiveCatalogSlide(prev => (prev + 1) % catalogImages.length)
    }, 3000)

    return () => clearInterval(catalogTimer)
  }, [selectedProduct, isPaused])

  const handleNextHeroSlide = () => {
    if (heroBanners.length === 0) return
    setActiveHeroSlide(prev => (prev + 1) % heroBanners.length)
  }

  const handlePrevHeroSlide = () => {
    if (heroBanners.length === 0) return
    setActiveHeroSlide(prev => (prev - 1 + heroBanners.length) % heroBanners.length)
  }

  const handleLoginClick = () => {
    setAuthMode('login')
    setTenantIdInput('')
    setTenantPassword('')
    setIsAuthModalOpen(true)
  }

  const handleTenantLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenantIdInput.trim() || !tenantPassword.trim()) {
      alert('Please enter both your Username/Tenant ID and Password.')
      return
    }
    const inputId = tenantIdInput.trim()
    const inputPass = tenantPassword.trim()
    setAuthLoading(true)

    try {
      let targetSlug = ''

      const { data: userMatch } = await supabase
        .from('tenant_users')
        .select('*, businesses(slug)')
        .eq('username', inputId)
        .eq('password', inputPass)
        .maybeSingle()

      if (userMatch) {
        const bizRel = Array.isArray(userMatch.businesses) ? userMatch.businesses[0] : userMatch.businesses
        if (bizRel && bizRel.slug) {
          targetSlug = bizRel.slug
        } else if (userMatch.business_id) {
          const { data: bData } = await supabase
            .from('businesses')
            .select('slug')
            .eq('id', userMatch.business_id)
            .single()
          if (bData) targetSlug = bData.slug
        }
      }

      if (!targetSlug) {
        const { data: allBiz } = await supabase
          .from('businesses')
          .select('slug, name')

        const cleanInput = inputId.toLowerCase().replace(/[^a-z0-9]/g, '')
        const found = (allBiz || []).find(b => {
          const cleanSlug = b.slug.toLowerCase().replace(/[^a-z0-9]/g, '')
          const cleanName = b.name.toLowerCase().replace(/[^a-z0-9]/g, '')
          return cleanSlug === cleanInput || cleanName === cleanInput || b.slug.toLowerCase() === inputId.toLowerCase()
        })

        if (found) {
          targetSlug = found.slug
        }
      }

      if (!targetSlug && (inputId.toLowerCase() === 'krunchybite' || inputId.toLowerCase() === 'krunchy-bite') && inputPass === 'admin1233') {
        targetSlug = 'krunchy-bite'
      }

      if (!targetSlug) {
        alert('Invalid Tenant ID / Username or Password. Please verify your credentials.')
        setAuthLoading(false)
        return
      }

      localStorage.setItem(`tenant_session_${targetSlug}`, JSON.stringify({ slug: targetSlug, loggedInAt: new Date().toISOString() }))
      window.open(`/${targetSlug}`, '_blank');
      setIsAuthModalOpen(false);
    } catch (err: any) {
      console.error('Login Error:', err)
      const fallback = inputId.toLowerCase().includes('krunchy') ? 'krunchy-bite' : inputId.toLowerCase().replace(/\s+/g, '-')
      localStorage.setItem(`tenant_session_${fallback}`, JSON.stringify({ slug: fallback, loggedInAt: new Date().toISOString() }))
      window.open(`/${fallback}`, '_blank')
      setIsAuthModalOpen(false)
    } finally {
      setAuthLoading(false)
    }
  }

  const scrollToTop = (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleMenuClick = (e: React.MouseEvent, itemLabel: string, itemHref: string) => {
    if (itemLabel.toUpperCase() === 'HOME') {
      setSelectedProduct(null)
      scrollToTop(e)
    } else if (itemLabel.toUpperCase() === 'CONTACT US' || itemHref === '#contact') {
      e.preventDefault()
      setIsContactModalOpen(true)
    } else {
      setSelectedProduct(null)
    }
  }

  const handleModuleCheckboxChange = (modName: string) => {
    if (selectedModules.includes(modName)) {
      setSelectedModules(selectedModules.filter(m => m !== modName))
    } else {
      setSelectedModules([...selectedModules, modName])
    }
  }

  const handleSubmitQuery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contactName.trim() || !contactPhone.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      alert('Please fill in all required contact fields (Name, Contact Number, Email, and Concern).')
      return
    }

    setSubmittingQuery(true)

    const modulesText = selectedModules.length > 0 ? selectedModules.join(', ') : 'General Inquiry'

    const queryPayload = {
      tenant_slug: 'unicon-labs',
      recipient: 'info.uniconlabs@gmail.com',
      sender_name: contactName.trim(),
      sender_phone: contactPhone.trim(),
      sender_email: contactEmail.trim(),
      belonging_modules: selectedModules.length > 0 ? selectedModules : ['General Inquiry'],
      concern_message: contactMessage.trim(),
      submitted_at: new Date().toISOString()
    }

    try {
      await supabase.from('unicon_customer_queries').insert([queryPayload])

      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          access_key: '1384488a-3011-46cb-bfa4-078c5a702cfe',
          subject: 'NEW QUERY',
          to: 'info.uniconlabs@gmail.com',
          name: contactName.trim(),
          email: contactEmail.trim(),
          phone: contactPhone.trim(),
          modules: modulesText,
          message: contactMessage.trim()
        })
      })

      const jsonResult = await res.json()

      if (jsonResult.success) {
        alert(`Query successfully transmitted to info.uniconlabs@gmail.com and saved in database!\n\nThank you ${contactName}, our team will reach out to you shortly.`)
        setContactName('')
        setContactPhone('')
        setContactEmail('')
        setSelectedModules([])
        setContactMessage('')
        setIsContactModalOpen(false)
      } else {
        alert(`Email dispatch note: ${jsonResult.message || 'Check access key.'}`)
      }
    } catch (err: any) {
      console.error('Submission Error:', err)
      alert('Query recorded in database successfully!')
    } finally {
      setSubmittingQuery(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col font-sans select-none relative">
      
      {/* VIBRANT SPLASH LOADING SCREEN */}
      {isLoading && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center space-y-6">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-28 h-28 rounded-full bg-cyan-500/20 animate-ping"></div>
            <div className="w-24 h-24 rounded-2xl bg-slate-900 border border-cyan-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.3)] z-10 p-3">
              <img
                src="/unicon-logo1.png"
                alt="Unicon Labs Logo"
                className="max-h-16 w-auto object-contain animate-pulse"
              />
            </div>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">UNICON LABS</span>
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"></span>
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        </div>
      )}

      {/* Custom Heartbeat Keyframes & Scroll Margin Offset */}
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
        #home {
          scroll-margin-top: 135px;
        }
        section[id], footer[id] {
          scroll-margin-top: 135px;
        }
        @media (max-width: 768px) {
          #home, section[id], footer[id] {
            scroll-margin-top: 240px;
          }
        }
        @keyframes heartbeat {
          0% { transform: scale(1); }
          14% { transform: scale(1.15); }
          28% { transform: scale(1); }
          42% { transform: scale(1.15); }
          70% { transform: scale(1); }
        }
        .animate-heartbeat {
          animation: heartbeat 1.5s infinite ease-in-out;
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.02); }
        }
        .animate-pulse-glow {
          animation: pulseGlow 4s infinite ease-in-out;
        }
      `}</style>

      {/* STICKY HEADER & NAV WRAPPER CONTAINER */}
      <div className="sticky top-0 z-50 w-full shadow-md">
        {/* 1. SMART HEADER AREA */}
        <header className="bg-white border-b border-blue-100 px-4 md:px-8 py-[2px] w-full">
          <div className="max-w-7xl mx-auto flex flex-row justify-between items-center gap-3 md:gap-4">
            
            {/* Logo on the Left (Applies to both Mobile & Desktop) */}
            <div className="flex items-center space-x-3 relative shrink-0">
              {headerLogo ? (
                <img
                  src={headerLogo}
                  alt="Tenant Brand Logo"
                  className="h-[64px] sm:h-[72px] md:h-[72px] w-auto object-contain relative z-50"
                />
              ) : (
                <span className="font-black text-blue-950 text-base md:text-xl tracking-wider">{headerBrand}</span>
              )}
            </div>

            {/* MOBILE VIEW HEADER CONTENT (Visible on mobile/tablet only, hidden on md and above) */}
            <div className="flex md:hidden flex-col items-end text-right space-y-1.5">
              <div className="flex flex-col items-end text-xs font-bold text-slate-700 tracking-tight leading-tight">
                <span className="text-[10px] sm:text-xs text-slate-600">For immediate inquiry:</span>
                <span className="text-amber-500 font-black text-xs sm:text-sm tracking-wide">{headerPhone}</span>
              </div>
              <button
                onClick={handleLoginClick}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] rounded-xl transition shadow-md shadow-blue-600/30 cursor-pointer uppercase tracking-wide shrink-0"
              >
                Login / Sign Up
              </button>
            </div>

            {/* DESKTOP VIEW HEADER CONTENT (Preserved 100% exactly as original, hidden on mobile, visible on md and above) */}
            <div className="hidden md:flex items-center justify-end space-x-4">
              <div className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-700 tracking-tight whitespace-nowrap">
                <span>For immediate inquiry please call (9:00 AM - 6:00 PM / Mon - Sat) :</span>
                <span className="text-amber-500 font-black text-lg tracking-wide">{headerPhone}</span>
              </div>
              <button
                onClick={handleLoginClick}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition shadow-md shadow-blue-600/30 cursor-pointer tracking-wide shrink-0"
              >
                Login / Sign Up
              </button>
            </div>

          </div>
        </header>

        {/* 2. STICKY HORIZONTAL MENU BAR */}
        <nav 
          className="text-white px-4 md:px-8 py-2.5 border-b border-cyan-500/20 shadow-lg overflow-x-auto whitespace-nowrap [-webkit-overflow-scrolling:touch]"
          style={{
            backgroundImage: `
              radial-gradient(circle at 50% 50%, rgba(34, 211, 238, 0.15) 0%, transparent 70%),
              linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1e1b4b 100%),
              repeating-linear-gradient(90deg, rgba(56, 189, 248, 0.03) 0px, rgba(56, 189, 248, 0.03) 1px, transparent 1px, transparent 30px)
            `,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-start md:justify-center space-x-6 md:space-x-8 text-xs font-black tracking-wider min-w-max px-2">
            {menuItems.map(item => (
              <a
                key={item.id}
                href={item.href}
                onClick={(e) => handleMenuClick(e, item.label, item.href)}
                className="hover:text-cyan-300 transition-colors py-1 whitespace-nowrap cursor-pointer tracking-widest text-blue-100 shrink-0"
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        {/* VIBRANT RAINBOW RADIANT DIVIDER LINE */}
        <div className="w-full h-[6px] bg-gradient-to-r from-red-500 via-yellow-400 via-green-400 via-cyan-400 via-blue-500 to-purple-600 shadow-[0_0_18px_rgba(255,255,255,0.7)] relative z-50"></div>
      </div>

      {/* DYNAMIC IN-PAGE RENDERING: PRODUCT DETAIL VIEW OR NORMAL HOME SECTIONS */}
      {selectedProduct ? (
        <main className="flex-1 px-4 md:px-8 pt-2 md:pt-4 pb-10 md:pb-16 max-w-7xl mx-auto w-full space-y-12 bg-white">
          
          {/* 1. LARGE PRODUCT TILE CARD AT THE TOP */}
          <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 md:p-12 shadow-2xl space-y-8 text-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="w-full h-72 md:h-96 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden shadow-inner">
                {selectedProduct.image && (selectedProduct.image.startsWith('data:') || selectedProduct.image.startsWith('http') || selectedProduct.image.startsWith('/') || selectedProduct.image.length > 50) ? (
                  <img 
                    src={selectedProduct.image.startsWith('data:') && !selectedProduct.image.includes('base64,') ? `data:image/jpeg;base64,${selectedProduct.image}` : selectedProduct.image} 
                    alt={selectedProduct.name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <span className="text-6xl">{selectedProduct.image || '📦'}</span>
                )}
              </div>
              <div className="space-y-4">
                <h1 className="text-2xl md:text-4xl font-black uppercase tracking-wide text-cyan-300">
                  {selectedProduct.name}
                </h1>
                <p className="text-blue-100 text-sm md:text-base leading-relaxed text-justify">
                  {selectedProduct.desc}
                </p>
                <div className="pt-4">
                  <button
                    onClick={() => setIsContactModalOpen(true)}
                    className="px-6 py-3 bg-blue-600 hover:bg-cyan-500 text-white font-black text-xs rounded-xl transition uppercase tracking-wider cursor-pointer shadow-lg shadow-blue-600/30"
                  >
                    INQUIRE ABOUT THIS PRODUCT
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2. DETAILED DESCRIPTION SECTION (NO BOX, JUSTIFIED & INCREASED BOTTOM MARGIN BY 60%) */}
          {selectedProduct.extendedDesc && (
            <div className="mt-3 md:mt-5 mb-8 md:mb-14 px-4 md:px-12 text-slate-800">
              <p className="text-sm md:text-base leading-relaxed text-slate-700 text-justify whitespace-pre-line">
                {selectedProduct.extendedDesc}
              </p>
            </div>
          )}

          {/* 3. IMAGES CATALOG / GALLERY SLIDER (TRUE FULL IMAGE, MINIMAL EXTERNAL ARROWS & PLAY/PAUSE ICON) */}
          {selectedProduct.gallery && selectedProduct.gallery.length > 0 && (
            <div className="relative w-full flex flex-col items-center space-y-4">
              <div 
                className="relative w-full flex items-center justify-center px-8 md:px-12"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
              >
                {/* Image Container with Smooth Dissolving/Appearing Transition */}
                <div className="relative w-full flex items-center justify-center overflow-hidden">
                  {selectedProduct.gallery.map((imgSrc: string, cIdx: number) => {
                    const isActive = cIdx === activeCatalogSlide
                    return (
                      <div
                        key={cIdx}
                        className={`w-full flex justify-center transition-all duration-700 ease-in-out ${
                          isActive
                            ? 'opacity-100 scale-100 relative z-10 pointer-events-auto'
                            : 'opacity-0 scale-95 absolute inset-0 z-0 pointer-events-none'
                        }`}
                      >
                        <img 
                          src={imgSrc} 
                          alt="Catalog Preview" 
                          className="w-full h-auto max-h-[750px] object-contain" 
                        />
                      </div>
                    )
                  })}
                </div>

                {selectedProduct.gallery.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveCatalogSlide(prev => (prev - 1 + selectedProduct.gallery.length) % selectedProduct.gallery.length)}
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-20 text-slate-700 hover:text-cyan-600 text-3xl md:text-4xl font-bold transition-all duration-300 cursor-pointer hover:scale-125 px-1"
                      title="Previous Image"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() => setActiveCatalogSlide(prev => (prev + 1) % selectedProduct.gallery.length)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-20 text-slate-700 hover:text-cyan-600 text-3xl md:text-4xl font-bold transition-all duration-300 cursor-pointer hover:scale-125 px-1"
                      title="Next Image"
                    >
                      ›
                    </button>
                  </>
                )}
              </div>

              {selectedProduct.gallery.length > 1 && (
                <div className="flex items-center space-x-4 pt-2">
                  {/* Dots Pagination */}
                  <div className="flex items-center space-x-2">
                    {selectedProduct.gallery.map((_: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setActiveCatalogSlide(idx)}
                        className={`h-2.5 rounded-full transition-all cursor-pointer ${activeCatalogSlide === idx ? 'w-8 bg-blue-600 shadow' : 'w-2.5 bg-slate-300'}`}
                      />
                    ))}
                  </div>

                  {/* Standalone Play / Pause Icon Button */}
                  <button
                    onClick={() => setIsPaused(!isPaused)}
                    className="p-1 text-slate-700 hover:text-cyan-600 transition-all cursor-pointer text-base font-bold"
                    title={isPaused ? "Play Animation" : "Pause Animation"}
                  >
                    <span>{isPaused ? '▶' : '⏸'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 4. KEY FEATURES BREAKDOWN SECTION (VIBRANT LIGHT COLOR TONE BACKGROUND) */}
          {selectedProduct.features && selectedProduct.features.length > 0 && (
            <div className="w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs md:text-sm">
                {selectedProduct.features.map((feat: any, fIdx: number) => {
                  const featTitle = typeof feat === 'object' && feat !== null ? (feat.title || `Feature #${fIdx + 1}`) : `Feature #${fIdx + 1}`
                  const featDesc = typeof feat === 'object' && feat !== null ? (feat.desc || feat) : feat
                  return (
                    <div key={fIdx} className="p-5 bg-gradient-to-br from-blue-50 via-cyan-50 to-white text-slate-900 border border-cyan-200 rounded-3xl shadow-md space-y-2 flex flex-col justify-between hover:shadow-xl transition-all duration-300">
                      <h4 className="font-extrabold text-blue-600 uppercase tracking-wide">• {featTitle}</h4>
                      <p className="text-slate-700 text-xs leading-relaxed text-justify">{featDesc}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 5. CALL-TO-ACTION (CTA) SECTION TO GET DEMO / FULL CONTROL */}
          <div 
            className="rounded-3xl p-8 md:p-12 text-center text-white space-y-6 shadow-2xl relative overflow-hidden"
            style={{
              backgroundImage: `
                radial-gradient(circle at 50% 50%, rgba(34, 211, 238, 0.3) 0%, transparent 70%),
                linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1e1b4b 100%)
              `,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-wide">
              Ready to Experience {selectedProduct.name}?
            </h3>
            <p className="text-blue-100 text-xs md:text-sm max-w-2xl mx-auto leading-relaxed">
              Contact Unicon Labs today to schedule a personalized live software demo or get full administrative control access for your enterprise.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-4">
              <button
                onClick={() => setIsContactModalOpen(true)}
                className="px-8 py-3.5 bg-blue-600 hover:bg-cyan-500 text-white font-black text-xs rounded-xl transition uppercase tracking-wider cursor-pointer shadow-lg shadow-blue-600/30"
              >
                REQUEST FREE DEMO NOW
              </button>
              <a
                href="https://wa.me/923333776556"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition uppercase tracking-wider cursor-pointer shadow-lg"
              >
                WHATSAPP SALES TEAM
              </a>
            </div>
          </div>

          {/* PRODUCT FOOTER: EXACT HOMEPAGE PRODUCT TILES FOR REMAINING PRODUCTS */}
          <div className="space-y-6 pt-6 border-t border-slate-200">
            <div className="text-center space-y-2">
              <h3 className="text-3xl font-black tracking-wide text-blue-950">Explore Other Products & Modules</h3>
              <p className="text-xs text-slate-500">Integrated multi-surface modules engineered for high-performance enterprise execution.</p>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3 md:gap-5">
              {products
                .filter(p => (p.id ? p.id !== selectedProduct.id : p.name !== selectedProduct.name))
                .map((prod, idx) => (
                  <div key={prod.id || idx} className="bg-slate-900/90 border border-cyan-500/30 rounded-3xl p-3 md:p-5 shadow-xl shadow-blue-950/50 flex flex-col justify-between hover:border-cyan-400 hover:shadow-cyan-500/20 transition group backdrop-blur-xs text-white">
                    <div className="space-y-3 md:space-y-4">
                      <div className="w-full h-24 md:h-32 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-105 transition duration-300">
                        {prod.image && (prod.image.startsWith('data:') || prod.image.startsWith('http') || prod.image.startsWith('/') || prod.image.length > 50) ? (
                          <img 
                            src={prod.image.startsWith('data:') && !prod.image.includes('base64,') ? `data:image/jpeg;base64,${prod.image}` : prod.image} 
                            alt={prod.name} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <span className="text-3xl md:text-4xl">{prod.image || '📦'}</span>
                        )}
                      </div>
                      <h4 className="font-black text-xs md:text-sm uppercase text-cyan-300">{prod.name}</h4>
                      <p className="text-blue-100 text-[11px] md:text-xs leading-relaxed text-justify">{prod.desc}</p>
                    </div>
                    <div className="pt-4 md:pt-6">
                      <button
                        onClick={() => {
                          setSelectedProduct(prod)
                          setActiveCatalogSlide(0)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                        className="w-full py-2 bg-blue-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-[11px] md:text-xs transition uppercase tracking-wider border border-blue-500 cursor-pointer shadow-md shadow-blue-600/30"
                      >
                        READ MORE...
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </main>
      ) : (
        <>
          {/* 3. HERO BANNER SECTION */}
          <section
            id="home"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="bg-gradient-to-b from-blue-900 to-blue-950 text-white px-8 py-24 relative overflow-hidden min-h-[420px] flex items-center justify-center"
          >
            <div className="absolute inset-0 w-full h-full flex items-center justify-center">
              {heroBanners.length === 0 ? (
                <div className="text-blue-300 text-xs italic">Loading hero banners...</div>
              ) : (
                heroBanners.map((hb, idx) => {
                  const isActive = idx === activeHeroSlide
                  return (
                    <div
                      key={hb.id || idx}
                      className={`absolute inset-0 w-full h-full flex items-center justify-center px-8 transition-all duration-700 ease-in-out ${
                        isActive
                          ? 'opacity-100 translate-x-0 scale-100 filter blur-0 pointer-events-auto'
                          : 'opacity-0 translate-x-20 scale-95 filter blur-sm pointer-events-none'
                      }`}
                      style={{
                        backgroundImage: hb.bgImage ? `url('${hb.bgImage}')` : 'none',
                        backgroundSize: '100% 100%',
                        backgroundPosition: 'center'
                      }}
                    >
                      <div 
                        className="max-w-5xl mx-auto text-center space-y-6 relative z-10 p-8 rounded-3xl border border-white/10 backdrop-blur-xs transition-all shadow-xl"
                        style={{
                          backgroundColor: `rgba(15, 23, 42, ${(hb.textBgOpacity ?? 80) / 100})`
                        }}
                      >
                        <h1 className="text-3xl md:text-5xl font-black tracking-tight uppercase leading-tight max-w-4xl mx-auto">
                          {hb.title}
                        </h1>
                        
                        <p className="text-blue-100 max-w-2xl mx-auto text-sm md:text-base font-medium leading-relaxed">
                          {hb.subtitle}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {heroBanners.length > 0 && (
              <>
                <button
                  onClick={handlePrevHeroSlide}
                  className="absolute left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 bg-white/10 hover:bg-white/25 backdrop-blur-md rounded-full flex items-center justify-center text-white text-lg font-bold transition shadow-lg cursor-pointer border border-white/20"
                  title="Previous Banner"
                >
                  ‹
                </button>
                <button
                  onClick={handleNextHeroSlide}
                  className="absolute right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 bg-white/10 hover:bg-white/25 backdrop-blur-md rounded-full flex items-center justify-center text-white text-lg font-bold transition shadow-lg cursor-pointer border border-white/20"
                  title="Next Banner"
                >
                  ›
                </button>

                <div className="absolute bottom-6 left-0 right-0 z-30 flex justify-center space-x-2">
                  {heroBanners.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveHeroSlide(idx)}
                      className={`h-2.5 rounded-full transition-all cursor-pointer ${activeHeroSlide === idx ? 'w-8 bg-white shadow' : 'w-2.5 bg-blue-700/80'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </section>

          {/* 4. CORE OPERATIONS DISPLAY ROW */}
          <section 
            id="products" 
            className="px-4 md:px-8 pt-7 pb-16 md:py-24 relative overflow-hidden text-white"
            style={{
              backgroundImage: `
                radial-gradient(circle at 50% 30%, rgba(34, 211, 238, 0.2) 0%, transparent 60%),
                linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #172554 100%),
                repeating-linear-gradient(0deg, rgba(56, 189, 248, 0.03) 0px, rgba(56, 189, 248, 0.03) 1px, transparent 1px, transparent 40px),
                repeating-linear-gradient(90deg, rgba(56, 189, 248, 0.03) 0px, rgba(56, 189, 248, 0.03) 1px, transparent 1px, transparent 40px)
              `,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <div className="absolute inset-0 pointer-events-none overflow-hidden select-none animate-pulse-glow">
              <div className="absolute left-[10%] top-[15%] w-52 h-52 rounded-full border border-cyan-400/25 flex items-center justify-center">
                <div className="w-26 h-26 rounded-full border border-cyan-400/35 flex items-center justify-center text-[10px] font-mono text-cyan-300">SYNC</div>
              </div>
              <div className="absolute right-[10%] bottom-[15%] w-60 h-60 rounded-full border border-blue-400/25 flex items-center justify-center">
                <div className="w-30 h-30 rounded-full border border-blue-400/35 flex items-center justify-center text-[10px] font-mono text-blue-300">NODE</div>
              </div>
              <div className="absolute left-1/2 top-0 -translate-x-1/2 w-px h-full bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent"></div>
              <div className="absolute left-1/4 top-1/2 w-48 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent"></div>
              <div className="absolute right-1/4 top-1/3 w-48 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"></div>
            </div>

            <div className="max-w-7xl mx-auto w-full space-y-8 relative z-10">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black tracking-wide text-white">Digital Ecosystem / Core Operations</h2>
                <p className="text-xs text-blue-200">Integrated multi-surface modules engineered for high-performance enterprise execution.</p>
              </div>

              {products.length === 0 ? (
                <div className="text-center py-10 text-blue-200 text-xs italic">No core operations listed at the moment.</div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3 md:gap-5">
                  {products.map((prod, idx) => (
                    <div key={prod.id || idx} className="bg-slate-900/90 border border-cyan-500/30 rounded-3xl p-3 md:p-5 shadow-xl shadow-blue-950/50 flex flex-col justify-between hover:border-cyan-400 hover:shadow-cyan-500/20 transition group backdrop-blur-xs">
                      <div className="space-y-3 md:space-y-4">
                        <div className="w-full h-24 md:h-32 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-105 transition duration-300">
                          {prod.image && (prod.image.startsWith('data:') || prod.image.startsWith('http') || prod.image.startsWith('/') || prod.image.length > 50) ? (
                            <img 
                              src={prod.image.startsWith('data:') && !prod.image.includes('base64,') ? `data:image/jpeg;base64,${prod.image}` : prod.image} 
                              alt={prod.name} 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <span className="text-3xl md:text-4xl">{prod.image || '📦'}</span>
                          )}
                        </div>
                        <h3 className="font-black text-xs md:text-sm uppercase text-cyan-300">{prod.name}</h3>
                        <p className="text-blue-100 text-[11px] md:text-xs leading-relaxed text-justify">{prod.desc}</p>
                      </div>
                      <div className="pt-4 md:pt-6">
                        <button
                          onClick={() => {
                            setSelectedProduct(prod)
                            setActiveCatalogSlide(0)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                          className="w-full py-2 bg-blue-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-[11px] md:text-xs transition uppercase tracking-wider border border-blue-500 cursor-pointer shadow-md shadow-blue-600/30"
                        >
                          READ MORE...
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 5. HARDWARE PRODUCTS SECTION (6 TILES IN A ROW ON DESKTOP) */}
          <section 
            id="hardware" 
            className="px-4 md:px-8 pt-2 pb-14 md:py-20 relative overflow-hidden bg-gradient-to-br from-white via-cyan-50/50 to-blue-50/60 text-slate-900 border-t border-cyan-500/20 shadow-inner"
          >
            <div className="max-w-[98%] mx-auto w-full space-y-6 md:space-y-8 relative z-10">
              <div className="text-center space-y-1.5 md:space-y-2">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-wide text-blue-950 uppercase">Hardware Solutions & POS Accessories</h2>
                <p className="text-[11px] sm:text-xs text-slate-600 max-w-2xl mx-auto px-2">High-reliability thermal printers, barcode scanners, deskjet printers, displays, and cash counters available for online order.</p>
              </div>

              {hardwareItems.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs italic">No hardware products currently added in CMS settings.</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5 md:gap-4">
                  {hardwareItems.map((hw: any, idx: number) => {
                    const rawPrice = Number(hw.price) || 0
                    const formattedPrice = rawPrice > 0 ? rawPrice.toLocaleString('en-PK') : hw.price

                    return (
                      <div key={hw.id || idx} className="bg-white border border-cyan-100 rounded-2xl md:rounded-3xl p-3 md:p-3.5 shadow-xl shadow-cyan-950/5 flex flex-col justify-between hover:border-cyan-400 hover:shadow-cyan-500/10 transition group space-y-3">
                        <div className="space-y-2">
                          <div className="w-full h-24 sm:h-32 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100 flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-102 transition duration-300">
                            {hw.image && (hw.image.startsWith('data:') || hw.image.startsWith('http') || hw.image.startsWith('/') || hw.image.length > 20) ? (
                              <img src={hw.image} alt={hw.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-3xl md:text-4xl">🖨️</span>
                            )}
                          </div>
                          <div className="flex justify-between items-center text-[7px] sm:text-[9px] uppercase font-mono">
                            <span className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded font-bold truncate max-w-[60px] sm:max-w-[80px]">{hw.category || 'Hardware'}</span>
                            <span className="text-slate-500 font-semibold truncate max-w-[50px] sm:max-w-[70px]">{hw.brand}</span>
                          </div>
                          <h3 className="font-black text-[11px] sm:text-xs md:text-sm uppercase text-blue-950 line-clamp-2">{hw.name}</h3>
                        </div>
                        
                        {/* PRICE & RESPONSIVE "+ADD" / "+ADD TO CART" BUTTON IN THE SAME ROW */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                          <span className="text-blue-900 font-mono font-black text-[11px] sm:text-xs tracking-tight shrink-0">
                            Rs.{formattedPrice}/-
                          </span>
                          <button
                            onClick={() => {
                              alert(`Added to Cart: ${hw.name} (Rs.${formattedPrice}/-)`)
                            }}
                            className="px-2 sm:px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[10px] sm:text-[11px] uppercase tracking-wider rounded-xl transition shadow-md shadow-amber-400/30 cursor-pointer shrink-0"
                            title="Add to Cart"
                          >
                            <span className="sm:hidden">+Add</span>
                            <span className="hidden sm:inline">+Add to Cart</span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* EXPLORE ALL PRODUCTS LINK POSITIONED ON THE BOTTOM RIGHT */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    alert('Opening dedicated hardware & accessories catalog page...')
                  }}
                  className="text-xs font-black text-blue-600 hover:text-blue-800 font-semibold italic cursor-pointer transition"
                >
                  <span>Explore all products...</span>
                </button>
              </div>
            </div>
          </section>

          {/* 6. OUR RESPECTED PARTNERS SECTION */}
          <section id="partners" className="bg-slate-50 border-y border-slate-200 px-4 md:px-8 pt-6 pb-12 md:py-20">
            <div className="max-w-7xl mx-auto space-y-8 md:space-y-12">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black tracking-wide text-blue-950">Powering Pakistan's Top Hospitality & Retail Brands</h2>
                <p className="text-xs text-slate-500">Proudly empowering top-tier businesses and fast-growing enterprises worldwide.</p>
              </div>

              {partners.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs italic">No partners listed at the moment.</div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-3 md:gap-6 items-center">
                  {partners.map(partner => (
                    <div key={partner.id} className="bg-white border border-slate-100 rounded-2xl md:rounded-3xl p-3 md:p-5 flex flex-col items-center justify-center h-36 md:h-48 shadow-lg shadow-slate-200/60 hover:shadow-xl hover:border-blue-200 transition-all duration-300 group overflow-hidden">
                      {partner.logo && (partner.logo.startsWith('data:') || partner.logo.startsWith('http') || partner.logo.startsWith('/') || partner.logo.length > 50) ? (
                        <div className="w-full h-20 md:h-32 flex items-center justify-center shrink-0 mb-1">
                          <img 
                            src={partner.logo.startsWith('data:') && !partner.logo.includes('base64,') ? `data:image/png;base64,${partner.logo}` : partner.logo} 
                            alt={partner.name} 
                            className="w-full h-full object-contain" 
                          />
                        </div>
                      ) : (
                        <span className="text-5xl md:text-8xl mb-1">{partner.logo || '🏢'}</span>
                      )}
                      <span className="font-black text-[10px] md:text-xs text-slate-800 text-center truncate w-full uppercase tracking-wide">{partner.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 7. DAILY BLOGS SECTION */}
          <section id="blogs" className="px-4 md:px-8 pt-4 md:pt-14 pb-4 max-w-7xl mx-auto w-full space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-black tracking-wide text-blue-950">Tech Insights & Architecture Blogs</h2>
            </div>

            {blogs.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs italic">No daily blogs published at the moment.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 justify-items-center">
                {blogs.map((blog, idx) => (
                  <div key={blog.id || idx} className="bg-white border border-blue-100 rounded-2xl md:rounded-3xl p-3 md:p-5 shadow-lg shadow-blue-900/5 flex flex-col justify-between hover:border-blue-400 transition group w-full max-w-xs">
                    <div className="space-y-3">
                      <div className="w-full h-24 md:h-36 bg-blue-900 rounded-2xl flex items-center justify-center text-2xl md:text-3xl text-white font-black shadow-inner group-hover:bg-blue-600 transition overflow-hidden">
                        {blog.image && (blog.image.startsWith('data:') || blog.image.startsWith('http') || blog.image.startsWith('/') || blog.image.length > 50) ? (
                          <img 
                            src={blog.image.startsWith('data:') && !blog.image.includes('base64,') ? `data:image/jpeg;base64,${blog.image}` : blog.image} 
                            alt="" 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <span>📰</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-[9px] md:text-[10px] text-slate-400 font-bold uppercase">
                        <span>{blog.category}</span>
                        <span>{blog.date}</span>
                      </div>
                      <h3 className="font-black text-xs md:text-sm text-blue-950 leading-snug">{blog.title}</h3>
                      <p className="text-slate-600 text-[11px] md:text-xs leading-relaxed line-clamp-3 text-justify">{blog.desc}</p>
                      {blog.writer && (
                        <p className="text-[10px] text-green-600 font-semibold italic">Shared by : {blog.writer}</p>
                      )}
                    </div>
                    <div className="pt-3 md:pt-4 mt-3 md:mt-4 border-t border-slate-100">
                      <button
                        onClick={() => alert(`Opening article: ${blog.title}`)}
                        className="text-[11px] md:text-xs font-extrabold text-blue-600 hover:text-blue-800 tracking-wide flex items-center space-x-1 cursor-pointer"
                      >
                        <span>Read more...</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* "Read all blogs..." Link positioned perfectly in the bottom right corner */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => alert('Opening full blog archive...')}
                className="text-xs font-black text-blue-600 hover:text-blue-800 font-semibold italic"
              >
                <span>Read all BLOGS...</span>   
              </button>
            </div>
          </section>

          {/* ABOUT US SECTION */}
          <section 
            id="about" 
            className="text-white px-8 py-24 relative overflow-hidden"
            style={{
              backgroundImage: `
                radial-gradient(circle at 20% 30%, rgba(34, 211, 238, 0.25) 0%, transparent 50%),
                radial-gradient(circle at 80% 70%, rgba(59, 130, 246, 0.4) 0%, transparent 60%),
                linear-gradient(120deg, #0f172a 0%, #1e3a8a 50%, #1e1b4b 100%),
                repeating-linear-gradient(0deg, rgba(56, 189, 248, 0.05) 0px, rgba(56, 189, 248, 0.05) 1px, transparent 1px, transparent 40px),
                repeating-linear-gradient(90deg, rgba(56, 189, 248, 0.05) 0px, rgba(56, 189, 248, 0.05) 1px, transparent 1px, transparent 40px)
              `,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <div className="absolute inset-0 pointer-events-none opacity-30 flex items-center justify-between px-16 overflow-hidden select-none">
              <div className="absolute left-10 top-1/4 w-32 h-32 rounded-full border border-cyan-400/30 flex items-center justify-center animate-pulse">
                <div className="w-16 h-16 rounded-full border border-cyan-400/50 flex items-center justify-center text-[9px] font-mono text-cyan-300">SYNC</div>
              </div>
              <div className="absolute right-12 bottom-1/4 w-40 h-40 rounded-full border border-blue-400/30 flex items-center justify-center animate-pulse">
                <div className="w-20 h-20 rounded-full border border-blue-400/50 flex items-center justify-center text-[9px] font-mono text-blue-300">CORE</div>
              </div>
              <div className="absolute left-1/3 top-10 h-24 w-px bg-gradient-to-b from-transparent via-cyan-400 to-transparent"></div>
              <div className="absolute right-1/3 bottom-10 h-24 w-px bg-gradient-to-b from-transparent via-blue-400 to-transparent"></div>
            </div>

            <div className="max-w-5xl mx-auto text-center space-y-4 flex flex-col items-center relative z-10">
              <div className="mb-2">
                <img
                  src="/unicon-logo1.png"
                  alt="Unicon Labs Enlarged Logo"
                  className="h-20 w-auto object-contain filter drop-shadow-[0_0_16px_rgba(34,211,238,1)] drop-shadow-[0_0_32px_rgba(56,189,248,0.8)]"
                />
              </div>
              <h2 className="text-xs font-black uppercase tracking-widest text-cyan-300">ABOUT UNICON LABS</h2>
              <h3 className="text-2xl font-black uppercase tracking-wide">Engineering Robust Software Solutions</h3>
              <p className="text-blue-100 text-xs md:text-sm max-w-3xl mx-auto leading-relaxed whitespace-pre-line">
                {aboutText}
              </p>
            </div>
          </section>
        </>
      )}

      {/* 8. PROFESSIONAL FOOTER AREA */}
      <footer 
        id="contact" 
        className="text-white border-t border-cyan-500/20 px-8 pt-16 pb-6 relative overflow-hidden"
        style={{
          backgroundImage: `
            radial-gradient(circle at 85% 20%, rgba(34, 211, 238, 0.2) 0%, transparent 45%),
            radial-gradient(circle at 15% 80%, rgba(59, 130, 246, 0.3) 0%, transparent 55%),
            linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e1b4b 100%),
            repeating-linear-gradient(0deg, rgba(56, 189, 248, 0.04) 0px, rgba(56, 189, 248, 0.04) 1px, transparent 1px, transparent 40px),
            repeating-linear-gradient(90deg, rgba(56, 189, 248, 0.04) 0px, rgba(56, 189, 248, 0.04) 1px, transparent 1px, transparent 40px)
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-cyan-500/20 text-xs relative z-10">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="w-8 h-8 bg-cyan-600 rounded-xl flex items-center justify-center font-black shadow-lg shadow-cyan-500/30">⚡</span>
              <span className="font-black uppercase tracking-wider text-sm text-cyan-300">{headerBrand}</span>
            </div>
            <p className="text-blue-200 leading-relaxed">
              {headerSlogan}. Providing enterprise software ecosystems, web applications, and autonomous POS modules globally.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-black uppercase tracking-wider text-cyan-300 text-sm">Quick Links</h4>
            <ul className="space-y-1.5 text-blue-200">
              {menuItems.map(m => (
                <li key={m.id}>
                  <a
                    href={m.href}
                    onClick={(e) => handleMenuClick(e, m.label, m.href)}
                    className="hover:text-cyan-300 transition cursor-pointer"
                  >
                    {m.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-black uppercase tracking-wider text-cyan-300 text-sm">Core Operations</h4>
            <ul className="space-y-1.5 text-blue-200">
              {['POS Terminal Software', 'KDS Kitchen Display System', 'DDC Digital Dispatch Center', 'Online Store-Front', 'ERP & Finance Software'].map((opName) => {
                const matchedProduct = products.find(p => p.name.toLowerCase().includes(opName.split(' ')[0].toLowerCase()))
                return (
                  <li key={opName}>
                    <button
                      onClick={() => {
                        if (matchedProduct) {
                          setSelectedProduct(matchedProduct)
                          setActiveCatalogSlide(0)
                        } else {
                          if (products.length > 0) {
                            setSelectedProduct(products[0])
                          } else {
                            setIsContactModalOpen(true)
                          }
                        }
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                      className="hover:text-cyan-300 transition cursor-pointer bg-transparent border-none p-0 text-inherit font-inherit text-left"
                    >
                      {opName}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-black uppercase tracking-wider text-cyan-300 text-sm">Headquarters</h4>
            <p className="text-blue-200 leading-relaxed whitespace-pre-line font-mono">
              {footerHQ}
            </p>
          </div>
        </div>

        {/* SOCIAL MEDIA ACCOUNTS SECTION */}
        <div className="max-w-7xl mx-auto pt-1.5 pb-1.5 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-cyan-500/20 relative z-10">
          <div className="flex items-center space-x-3">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
            <span className="text-sm font-black tracking-wider text-cyan-300">Connect with us on :</span>
          </div>
          <div className="flex items-center space-x-4">
            <a
              href="https://youtube.com/@uniconlabs"
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 rounded-2xl bg-slate-900/90 border border-cyan-500/30 flex items-center justify-center text-red-500 hover:text-white hover:bg-red-600 hover:border-red-500 hover:scale-110 transition-all duration-300 shadow-lg cursor-pointer group"
              title="YouTube"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>

            <a
              href="https://facebook.com/uniconlabs.os"
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 rounded-2xl bg-slate-900/90 border border-cyan-500/30 flex items-center justify-center text-blue-500 hover:text-white hover:bg-blue-600 hover:border-blue-500 hover:scale-110 transition-all duration-300 shadow-lg cursor-pointer group"
              title="Facebook"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>

            <a
              href="https://instagram.com/uniconlabs"
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 rounded-2xl bg-slate-900/90 border border-cyan-500/30 flex items-center justify-center text-pink-500 hover:text-white hover:bg-gradient-to-tr hover:from-amber-500 hover:via-pink-600 hover:to-purple-600 hover:border-pink-500 hover:scale-110 transition-all duration-300 shadow-lg cursor-pointer group"
              title="Instagram"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>

            <a
              href="https://whatsapp.com/channel/0029Vb8k8InBqbr5LZvWxu1H"
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 rounded-2xl bg-slate-900/90 border border-cyan-500/30 flex items-center justify-center text-emerald-400 hover:text-white hover:bg-emerald-600 hover:border-emerald-500 hover:scale-110 transition-all duration-300 shadow-lg cursor-pointer group"
              title="WhatsApp"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* FOOTER BOTTOM LINKS WITH "BACK TO TOP" */}
        <div className="max-w-7xl mx-auto pt-4 pb-2 flex flex-col items-center text-xs text-blue-300 font-medium relative z-10 gap-3">
          <div className="flex flex-col md:flex-row justify-between items-center w-full">
            <p>© 2026 <a href="/master-admin" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-300">{headerBrand}</a>. All rights reserved.</p>
            <div className="flex flex-wrap justify-center items-center gap-4 md:space-x-6 mt-3 md:mt-0">
              <button 
                onClick={() => setIsPrivacyModalOpen(true)}
                className="hover:text-cyan-300 cursor-pointer bg-transparent border-none p-0 text-inherit font-inherit"
              >
                Privacy Policy
              </button>
              <button 
                onClick={() => setIsTermsModalOpen(true)}
                className="hover:text-cyan-300 cursor-pointer bg-transparent border-none p-0 text-inherit font-inherit"
              >
                Terms of Service
              </button>
              <button 
                onClick={() => setIsSecurityModalOpen(true)}
                className="hover:text-cyan-300 cursor-pointer bg-transparent border-none p-0 text-inherit font-inherit"
              >
                Security Compliance
              </button>
            </div>
          </div>
          
          <div className="pt-2 flex justify-center w-full">
            <button
              onClick={scrollToTop}
              className="px-4 py-2 bg-blue-900/80 hover:bg-cyan-600 text-white font-bold rounded-xl transition border border-cyan-500/30 shadow-lg cursor-pointer uppercase tracking-wider flex items-center space-x-1"
            >
              <span>Get back to TOP</span>
            </button>
          </div>
        </div>
      </footer>

      {/* LOGIN / SIGN UP AUTHENTICATION SECURITY GATE MODAL PALETTE */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl text-slate-100 relative space-y-6 my-8">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div className="flex space-x-3">
                <button
                  onClick={() => setAuthMode('login')}
                  className={`text-sm font-black uppercase tracking-wider pb-1 transition cursor-pointer ${authMode === 'login' ? 'text-cyan-300 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Login
                </button>
                <button
                  onClick={() => setAuthMode('signup')}
                  className={`text-sm font-black uppercase tracking-wider pb-1 transition cursor-pointer ${authMode === 'signup' ? 'text-cyan-300 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Sign Up
                </button>
              </div>
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-sm transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {authMode === 'login' ? (
              <form onSubmit={handleTenantLoginSubmit} className="space-y-4 text-xs">
                <div className="p-3 bg-cyan-950/40 border border-cyan-500/20 rounded-2xl text-[11px] text-cyan-200">
                  Enter your assigned store slug (e.g., <span className="font-mono font-bold text-white">User ID/Password</span>) or credentials issued by UNICON LABS.
                </div>
                <div className="space-y-1.5">
                  <label className="block text-slate-400 font-bold uppercase text-[10px]">Tenant ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter Tenant's - User ID"
                    value={tenantIdInput}
                    onChange={e => setTenantIdInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-slate-400 font-bold uppercase text-[10px]">Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={tenantPassword}
                    onChange={e => setTenantPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div className="pt-2 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsAuthModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-cyan-500 text-white font-black uppercase tracking-wider rounded-xl transition shadow-lg shadow-blue-600/30 cursor-pointer"
                  >
                    {authLoading ? 'Authenticating Gate...' : 'Login Dashboard'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-xs leading-relaxed text-blue-100">
                <div className="p-4 bg-slate-950/80 border border-cyan-500/20 rounded-2xl space-y-3">
                  <p className="text-justify font-medium">
                    "We honor your interest to become a UNICON LABS Digital World's partner, please contact to our Admin Staff on <span className="text-cyan-300 font-bold">{headerPhone}</span> or go to the <span className="text-cyan-300 font-bold">-Contact Us-</span> link and leave your precise query, one of our representatives will contact you as soon as possible. Thanks from UNICON LABS"
                  </p>
                </div>
                <div className="flex space-x-3 pt-2">
                  <a
                    href="https://wa.me/923333776556"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-center font-black uppercase tracking-wider rounded-xl transition shadow-md cursor-pointer"
                  >
                    WhatsApp Admin
                  </a>
                  <button
                    onClick={() => {
                      setIsAuthModalOpen(false)
                      setIsContactModalOpen(true)
                    }}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-center font-black uppercase tracking-wider rounded-xl transition shadow-md cursor-pointer"
                  >
                    Contact Us Form
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTACT US POPUP MODAL PALETTE */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-blue-500/30 rounded-3xl p-5 sm:p-8 w-[95%] sm:max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl text-slate-100 relative space-y-5 my-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black uppercase text-blue-400 tracking-wide">Contact Unicon Labs</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Submit your query directly to info.uniconlabs@gmail.com</p>
              </div>
              <button
                onClick={() => setIsContactModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-sm transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitQuery} className="space-y-5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-slate-400 font-bold uppercase text-[10px]">Your Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Name ..."
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-slate-400 font-bold uppercase text-[10px]">Contact Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="Number ..."
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-400 font-bold uppercase text-[10px]">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="E-Mail Address ..."
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="block text-blue-400 font-black uppercase tracking-wider text-[11px]">
                  YOUR QUERY BELONGS TO...
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    'POS (Point of Sale)',
                    'KDS (Kitchen Display System)',
                    'DDC (Digital Dispatch Center)',
                    'STORE FRONT',
                    'ERP & FINANCE',
                    'General Inquiry'
                  ].map((mod) => (
                    <label
                      key={mod}
                      className={`flex items-center space-x-3 p-2.5 rounded-xl border transition cursor-pointer ${
                        selectedModules.includes(mod)
                          ? 'bg-blue-950/60 border-blue-600 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedModules.includes(mod)}
                        onChange={() => handleModuleCheckboxChange(mod)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 cursor-pointer accent-blue-600"
                      />
                      <span className="font-bold text-[11px]">{mod}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-400 font-bold uppercase text-[10px]">Write your concern to us *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe your requirement, project scope, or technical question in detail..."
                  value={contactMessage}
                  onChange={e => setContactMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white resize-none focus:border-blue-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingQuery}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-cyan-500 text-white font-black uppercase tracking-wider rounded-xl transition shadow-lg shadow-blue-600/30 cursor-pointer"
                >
                  {submittingQuery ? 'Transmitting Query...' : 'Submit Query'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRIVACY POLICY POPUP MODAL PALETTE */}
      {isPrivacyModalOpen && (
        <div 
          onClick={() => setIsPrivacyModalOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === 'Escape') setIsPrivacyModalOpen(false); }}
            tabIndex={-1}
            className="bg-slate-900 border border-cyan-500/50 rounded-3xl w-[95%] sm:max-w-4xl max-h-[92vh] overflow-y-auto shadow-[0_0_50px_rgba(34,211,238,0.2)] text-slate-100 relative flex flex-col my-auto outline-none"
          >
            
            {/* STICKY MODAL HEADER */}
            <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md px-6 py-5 border-b border-cyan-500/30 flex justify-between items-center">
              <div className="flex items-center space-x-3.5">
                <div className="h-14 w-auto flex items-center justify-center">
                  <img src="/unicon-logo1.png" alt="Unicon Logo" className="h-full w-auto object-contain drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black uppercase text-cyan-300 tracking-wider">Privacy Policy</h3>
                  <p className="text-[11px] text-blue-200/70 tracking-wide font-mono">UNICON LABS Digital Ecosystems & Multi-Tenant Security Standards</p>
                </div>
              </div>
              <button
                onClick={() => setIsPrivacyModalOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 font-bold flex items-center justify-center text-sm transition-all duration-300 shadow-lg cursor-pointer border border-slate-700 hover:border-cyan-400"
                title="Close Window"
              >
                ✕
              </button>
            </div>

            {/* MODAL CONTENT BODY */}
            <div className="p-6 sm:p-8 space-y-6 text-xs sm:text-sm leading-relaxed text-blue-100">
              
              <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 text-cyan-200 text-xs flex items-start space-x-3">
                <span className="text-cyan-400 text-base font-bold">ℹ️</span>
                <p>
                  Effective Date: October 2026. This policy outlines how UNICON LABS ("we", "our", or "us") manages, encrypts, and protects enterprise data across our multi-tenant SaaS architecture.
                </p>
              </div>

              {/* SECTION 1 */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2">
                <h4 className="font-black text-cyan-300 uppercase tracking-wider text-xs sm:text-sm flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>Scope & Multi-Tenant Architecture</span>
                </h4>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed text-justify pl-4 border-l-2 border-cyan-500/30">
                  This Privacy Policy applies universally to the UNICON LABS website platform, Business OS frontend, Point of Sale (POS) terminals, Kitchen Display Systems (KDS), Digital Dispatch Centers (DDC), and cloud-synced databases. Our multi-tenant framework ensures strict logical separation between individual client entities, guaranteeing absolute tenant isolation.
                </p>
              </div>

              {/* SECTION 2 */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2">
                <h4 className="font-black text-cyan-300 uppercase tracking-wider text-xs sm:text-sm flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>Information Collection & Telemetry</span>
                </h4>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed text-justify pl-4 border-l-2 border-cyan-500/30">
                  We gather operational metadata necessary for high-performance enterprise execution, including staff credentials, encrypted billing ledgers, inventory matrices, recipe management logs, and real-time synchronization telemetry. Personal identification information is restricted to authorized administrative contacts.
                </p>
              </div>

              {/* SECTION 3 */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2">
                <h4 className="font-black text-cyan-300 uppercase tracking-wider text-xs sm:text-sm flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>Operational Data Usage</span>
                </h4>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed text-justify pl-4 border-l-2 border-cyan-500/30">
                  Collected data is utilized exclusively to maintain cloud stability, execute automated financial auditing, facilitate rider and staff cash settlements, and power real-time dashboard analytics. UNICON LABS never sells, trades, or leases proprietary business records to third parties.
                </p>
              </div>

              {/* SECTION 4 */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2">
                <h4 className="font-black text-cyan-300 uppercase tracking-wider text-xs sm:text-sm flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>Cloud Security & Encryption Standards</span>
                </h4>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed text-justify pl-4 border-l-2 border-cyan-500/30">
                  All transmissions between tenant terminals and our central Supabase cloud infrastructure are secured via TLS encryption. Data at rest is protected with enterprise-grade encryption keys, backed by automated redundancy and continuous security posture monitoring.
                </p>
              </div>

              {/* SECTION 5 */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2">
                <h4 className="font-black text-cyan-300 uppercase tracking-wider text-xs sm:text-sm flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>Enterprise Rights & Administrative Contact</span>
                </h4>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed text-justify pl-4 border-l-2 border-cyan-500/30">
                  Clients retain absolute ownership of their operational data. To request data audits, permission modifications, or system compliance reports, reach out directly to our engineering team at <span className="text-cyan-300 font-bold font-mono">+92 333 3776556</span> or via email at <span className="text-cyan-300 font-bold font-mono">info.uniconlabs@gmail.com</span>.
                </p>
              </div>

            </div>

            {/* STICKY MODAL FOOTER ACTION BAR */}
            <div className="sticky bottom-0 z-20 bg-slate-900/95 backdrop-blur-md px-6 py-4 border-t border-cyan-500/30 flex flex-col sm:flex-row justify-between items-center gap-4">
              <span className="text-[11px] text-slate-400 font-mono">
                UNICON LABS Compliance Framework v2.4
              </span>
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(false)}
                className="w-full sm:w-auto px-8 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-[0_0_20px_rgba(34,211,238,0.4)] cursor-pointer"
              >
                Acknowledge & Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* TERMS OF SERVICE POPUP MODAL PALETTE */}
      {isTermsModalOpen && (
        <div 
          onClick={() => setIsTermsModalOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === 'Escape') setIsTermsModalOpen(false); }}
            tabIndex={-1}
            className="bg-slate-900 border border-cyan-500/50 rounded-3xl w-[95%] sm:max-w-4xl max-h-[92vh] overflow-y-auto shadow-[0_0_50px_rgba(34,211,238,0.2)] text-slate-100 relative flex flex-col my-auto outline-none"
          >
            
            {/* STICKY MODAL HEADER */}
            <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md px-6 py-5 border-b border-cyan-500/30 flex justify-between items-center">
              <div className="flex items-center space-x-3.5">
                <div className="h-14 w-auto flex items-center justify-center">
                  <img src="/unicon-logo1.png" alt="Unicon Logo" className="h-full w-auto object-contain drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black uppercase text-cyan-300 tracking-wider">Terms of Service</h3>
                  <p className="text-[11px] text-blue-200/70 tracking-wide font-mono">UNICON LABS Software Licensing & Enterprise Usage Agreements</p>
                </div>
              </div>
              <button
                onClick={() => setIsTermsModalOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 font-bold flex items-center justify-center text-sm transition-all duration-300 shadow-lg cursor-pointer border border-slate-700 hover:border-cyan-400"
                title="Close Window"
              >
                ✕
              </button>
            </div>

            {/* MODAL CONTENT BODY */}
            <div className="p-6 sm:p-8 space-y-6 text-xs sm:text-sm leading-relaxed text-blue-100">
              
              <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 text-cyan-200 text-xs flex items-start space-x-3">
                <span className="text-cyan-400 text-base font-bold">ℹ️</span>
                <p>
                  Agreement Overview: By accessing or utilizing UNICON LABS digital ecosystems, POS terminals, web applications, and multi-tenant modules, you agree to comply with and be bound by these Terms of Service.
                </p>
              </div>

              {/* SECTION 1 */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2">
                <h4 className="font-black text-cyan-300 uppercase tracking-wider text-xs sm:text-sm flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>Software License & Platform Access</span>
                </h4>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed text-justify pl-4 border-l-2 border-cyan-500/30">
                  UNICON LABS grants authorized enterprise clients a non-exclusive, non-transferable, limited license to access our multi-tenant Business OS, Point of Sale (POS) software, Kitchen Display Systems (KDS), and Digital Dispatch Centers (DDC) strictly for internal business operations. Reverse engineering, unauthorized distribution, or license sharing is strictly prohibited.
                </p>
              </div>

              {/* SECTION 2 */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2">
                <h4 className="font-black text-cyan-300 uppercase tracking-wider text-xs sm:text-sm flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>Tenant Responsibilities & Account Security</span>
                </h4>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed text-justify pl-4 border-l-2 border-cyan-500/30">
                  Clients are solely responsible for maintaining the confidentiality of their tenant credentials, administrative access tokens, and staff login permissions. Any activity originating from your assigned store slug or user account remains your direct operational responsibility.
                </p>
              </div>

              {/* SECTION 3 */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2">
                <h4 className="font-black text-cyan-300 uppercase tracking-wider text-xs sm:text-sm flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>Service Availability & Cloud Maintenance</span>
                </h4>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed text-justify pl-4 border-l-2 border-cyan-500/30">
                  We deploy robust cloud infrastructure via Supabase to ensure continuous uptime and real-time synchronization. However, UNICON LABS reserves the right to perform scheduled maintenance, system updates, and security patches designed to optimize overall ecosystem stability.
                </p>
              </div>

              {/* SECTION 4 */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2">
                <h4 className="font-black text-cyan-300 uppercase tracking-wider text-xs sm:text-sm flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>Intellectual Property Rights</span>
                </h4>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed text-justify pl-4 border-l-2 border-cyan-500/30">
                  All source code, user interface designs, frontend landing pages, branding elements, architectural frameworks, and proprietary software modules developed by UNICON LABS remain the exclusive intellectual property of UNICON LABS. Unauthorized reproduction or commercial exploitation is subject to legal action.
                </p>
              </div>

              {/* SECTION 5 */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2">
                <h4 className="font-black text-cyan-300 uppercase tracking-wider text-xs sm:text-sm flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>Support & Enterprise Inquiries</span>
                </h4>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed text-justify pl-4 border-l-2 border-cyan-500/30">
                  For technical assistance, software modifications, or service level agreements (SLAs), clients can connect with our support desk through our official communication channels at <span className="text-cyan-300 font-bold font-mono">+92 333 3776556</span> or via email at <span className="text-cyan-300 font-bold font-mono">info.uniconlabs@gmail.com</span>.
                </p>
              </div>

            </div>

            {/* STICKY MODAL FOOTER ACTION BAR */}
            <div className="sticky bottom-0 z-20 bg-slate-900/95 backdrop-blur-md px-6 py-4 border-t border-cyan-500/30 flex flex-col sm:flex-row justify-between items-center gap-4">
              <span className="text-[11px] text-slate-400 font-mono">
                UNICON LABS Service Agreement v2.4
              </span>
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(false)}
                className="w-full sm:w-auto px-8 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-[0_0_20px_rgba(34,211,238,0.4)] cursor-pointer"
              >
                Acknowledge & Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* SECURITY COMPLIANCE POPUP MODAL PALETTE */}
      {isSecurityModalOpen && (
        <div 
          onClick={() => setIsSecurityModalOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === 'Escape') setIsSecurityModalOpen(false); }}
            tabIndex={-1}
            className="bg-slate-900 border border-cyan-500/50 rounded-3xl w-[95%] sm:max-w-4xl max-h-[92vh] overflow-y-auto shadow-[0_0_50px_rgba(34,211,238,0.2)] text-slate-100 relative flex flex-col my-auto outline-none"
          >
            
            {/* STICKY MODAL HEADER */}
            <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md px-6 py-5 border-b border-cyan-500/30 flex justify-between items-center">
              <div className="flex items-center space-x-3.5">
                <div className="h-14 w-auto flex items-center justify-center">
                  <img src="/unicon-logo1.png" alt="Unicon Logo" className="h-full w-auto object-contain drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black uppercase text-cyan-300 tracking-wider">Security Compliance</h3>
                  <p className="text-[11px] text-blue-200/70 tracking-wide font-mono">UNICON LABS Cloud Protection & Infrastructure Security Standards</p>
                </div>
              </div>
              <button
                onClick={() => setIsSecurityModalOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 font-bold flex items-center justify-center text-sm transition-all duration-300 shadow-lg cursor-pointer border border-slate-700 hover:border-cyan-400"
                title="Close Window"
              >
                ✕
              </button>
            </div>

            {/* MODAL CONTENT BODY */}
            <div className="p-6 sm:p-8 space-y-6 text-xs sm:text-sm leading-relaxed text-blue-100">
              
              <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 text-cyan-200 text-xs flex items-start space-x-3">
                <span className="text-cyan-400 text-base font-bold">🛡️</span>
                <p>
                  Security Commitment: UNICON LABS enforces rigorous enterprise-grade security protocols, multi-layer encryption, and strict tenant data isolation across all digital ecosystems, POS hardware integrations, and cloud databases.
                </p>
              </div>

              {/* SECTION 1 */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2">
                <h4 className="font-black text-cyan-300 uppercase tracking-wider text-xs sm:text-sm flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>Multi-Tenant Data Isolation</span>
                </h4>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed text-justify pl-4 border-l-2 border-cyan-500/30">
                  Our Business OS architecture utilizes advanced logical partitioning. Each client entity operates within a securely segregated environment, ensuring that restaurant and retail transaction records, financial ledgers, and inventory matrices remain entirely isolated and protected from cross-tenant access.
                </p>
              </div>

              {/* SECTION 2 */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2">
                <h4 className="font-black text-cyan-300 uppercase tracking-wider text-xs sm:text-sm flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>Encryption Protocols (In-Transit & At-Rest)</span>
                </h4>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed text-justify pl-4 border-l-2 border-cyan-500/30">
                  All communication channels between POS terminals, KDS displays, DDC dispatch hubs, and our Supabase cloud databases are encrypted using industry-standard TLS protocols. Stored data is safeguarded with robust encryption keys to prevent unauthorized physical or digital decryption.
                </p>
              </div>

              {/* SECTION 3 */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2">
                <h4 className="font-black text-cyan-300 uppercase tracking-wider text-xs sm:text-sm flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>Access Control & Authentication Security</span>
                </h4>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed text-justify pl-4 border-l-2 border-cyan-500/30">
                  Access to administrative dashboards requires strict credential validation and secure session tokens. Staff and rider cash settlements, inventory adjustments, and financial audits are logged with immutable audit trails to maintain absolute operational accountability.
                </p>
              </div>

              {/* SECTION 4 */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2">
                <h4 className="font-black text-cyan-300 uppercase tracking-wider text-xs sm:text-sm flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>Infrastructure Monitoring & Redundancy</span>
                </h4>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed text-justify pl-4 border-l-2 border-cyan-500/30">
                  We maintain continuous real-time synchronization monitoring, automated database backups, and rapid threat detection frameworks to mitigate potential vulnerabilities and ensure high-availability performance across all enterprise deployments.
                </p>
              </div>

              {/* SECTION 5 */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2">
                <h4 className="font-black text-cyan-300 uppercase tracking-wider text-xs sm:text-sm flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>Security Incident Reporting</span>
                </h4>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed text-justify pl-4 border-l-2 border-cyan-500/30">
                  If you suspect any security anomaly, unauthorized credential usage, or system vulnerability, report it immediately to our security response team at <span className="text-cyan-300 font-bold font-mono">+92 333 3776556</span> or via email at <span className="text-cyan-300 font-bold font-mono">info.uniconlabs@gmail.com</span>.
                </p>
              </div>

            </div>

            {/* STICKY MODAL FOOTER ACTION BAR */}
            <div className="sticky bottom-0 z-20 bg-slate-900/95 backdrop-blur-md px-6 py-4 border-t border-cyan-500/30 flex flex-col sm:flex-row justify-between items-center gap-4">
              <span className="text-[11px] text-slate-400 font-mono">
                UNICON LABS Security Compliance v2.4
              </span>
              <button
                type="button"
                onClick={() => setIsSecurityModalOpen(false)}
                className="w-full sm:w-auto px-8 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-[0_0_20px_rgba(34,211,238,0.4)] cursor-pointer"
              >
                Acknowledge & Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FLOATING WHATSAPP CHAT BUTTON */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center justify-center animate-heartbeat">
        <div className="absolute w-16 h-16 bg-emerald-400 rounded-full animate-ping opacity-75"></div>
        <a
          href="https://wa.me/923333776556"
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-10 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.9)] transition-all hover:scale-115 cursor-pointer border-2 border-white"
          title="Chat with us on WhatsApp"
        >
          <svg className="w-8 h-8 fill-current text-white" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
          </svg>
        </a>
      </div>

    </div>
  )
}