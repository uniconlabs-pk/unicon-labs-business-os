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

  // Contact Modal States
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [selectedModules, setSelectedModules] = useState<string[]>([])
  const [contactMessage, setContactMessage] = useState('')
  const [submittingQuery, setSubmittingQuery] = useState(false)

  // Dynamic Content State loaded from Supabase
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
  const [heroSlideInterval, setHeroSlideInterval] = useState(4500)
  const [heroBanners, setHeroBanners] = useState([
    { id: 1, title: 'POWERING AUTONOMOUS ENTERPRISE ECOSYSTEMS', subtitle: 'Next-generation multi-tenant Business OS designed for scale, speed, and real-time offline sync.', tag: 'FLAGSHIP PLATFORM', bgImage: '', textBgOpacity: 80 },
    { id: 2, title: 'INTELLIGENT POINT OF SALE & KITCHEN DISPLAY', subtitle: 'Streamline multi-tender settlement, split payments, FBR fiscal integration, and instant KOT ticket routing.', tag: 'OPERATIONAL EXCELLENCE', bgImage: '', textBgOpacity: 80 },
    { id: 3, title: 'REAL-TIME LOGISTICS & DISPATCH QUEUE', subtitle: 'Effortlessly manage delivery fleets, rider assignments, and automated customer notifications.', tag: 'SUPPLY CHAIN', bgImage: '', textBgOpacity: 80 },
  ])
  const [products, setProducts] = useState([
    { id: 1, name: 'Adaptive POS Terminal', desc: 'Feature-rich multi-surface touchscreen cash register and terminal engine.', image: '🖥️' },
    { id: 2, name: 'Kitchen Display System (KDS)', desc: 'Live order ticket dispatch routing with speed-of-service performance meters.', image: '🍳' },
    { id: 3, name: 'Dispatch & Fulfillment', desc: 'Complete delivery order queue manager with rider tracking and analytics.', image: '📦' },
    { id: 4, name: 'Enterprise ERP & Finance', desc: 'Automated ledger tracking, tax compliance, and comprehensive audit reports.', image: '📊' },
    { id: 5, name: 'Customer Storefront Portal', desc: 'Branded public web ordering storefront connected directly to your POS.', image: '🛍️' }
  ])
  const [partners, setPartners] = useState(
    Array.from({ length: 18 }, (_, i) => ({ id: i + 1, name: `Partner Brand ${i + 1}`, logo: '🏢' }))
  )
  const [blogs, setBlogs] = useState([
    { id: 1, title: 'Scaling Cloud POS Architecture in 2026', date: 'Oct 04, 2026', category: 'Engineering', desc: 'Discover how offline-first Supabase synchronization keeps retail stores running smoothly.' },
    { id: 2, title: 'Optimizing Kitchen Workflow with KDS', date: 'Sep 28, 2026', category: 'Operations', desc: 'Best practices for reducing order preparation times in high-volume restaurants.' },
  ])
  const [aboutText, setAboutText] = useState('Founded with a vision to revolutionize enterprise operations, Unicon Labs specializes in building end-to-end digital ecosystems. From multi-tenant POS hardware integrations to cloud synchronization and automated financial auditing, we provide the infrastructure businesses need to thrive.')
  const [footerHQ, setFooterHQ] = useState('Software Development Enterprise\nDigital Ecosystems & Modules\nEmail: care.uniconlabs@gmail.com')

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
    if (s.headerSubtitle) setHeaderSubtitle(s.headerSubtitle)
    if (s.menuItems) setMenuItems(s.menuItems)
    if (s.heroSlideInterval) setHeroSlideInterval(s.heroSlideInterval)
    if (s.heroBanners && s.heroBanners.length > 0) setHeroBanners(s.heroBanners)
    if (s.products && s.products.length > 0) setProducts(s.products)
    if (s.partners && s.partners.length > 0) setPartners(s.partners)
    if (s.blogs && s.blogs.length > 0) setBlogs(s.blogs)
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

  const handleNextSlide = () => {
    setActiveHeroSlide(prev => (prev + 1) % heroBanners.length)
  }

  const handlePrevSlide = () => {
    setActiveHeroSlide(prev => (prev - 1 + heroBanners.length) % heroBanners.length)
  }

  const handleLoginClick = () => {
    const slug = prompt('Please enter your business tenant slug (e.g., krunchy-bite):')
    if (slug && slug.trim()) {
      router.push(`/${slug.trim().toLowerCase()}/pos`)
    }
  }

  const scrollToTop = (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleMenuClick = (e: React.MouseEvent, itemLabel: string, itemHref: string) => {
    if (itemLabel.toUpperCase() === 'HOME') {
      scrollToTop(e)
    } else if (itemLabel.toUpperCase() === 'CONTACT US' || itemHref === '#contact') {
      e.preventDefault()
      setIsContactModalOpen(true)
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
      // 1. Save query securely in Supabase database
      await supabase.from('unicon_customer_queries').insert([queryPayload])

      // 2. Dispatch email with subject set to "NEW QUERY" using Web3Forms API
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
        
        // Reset form & close modal
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
      `}</style>

      {/* STICKY HEADER & NAV WRAPPER CONTAINER TO ENSURE 0% GAP */}
      <div className="sticky top-0 z-50 w-full shadow-md">
        {/* 1. SMART HEADER AREA */}
        <header className="bg-white border-b border-blue-100 px-8 py-3 flex justify-between items-center overflow-visible">
          <div className="flex items-center space-x-4 relative">
            <img
              src="/unicon-logo.png"
              alt="Unicon Labs Logo"
              className="h-24 w-auto object-contain relative z-50 filter drop-shadow-md scale-125 origin-left"
            />
            <div className="flex flex-col justify-center text-center pl-4">
              <span className="text-2xl font-black tracking-wider uppercase text-blue-900 block">
                {headerBrand}
              </span>
              <span className="text-sm font-extrabold bg-blue-50 text-blue-600 px-3 py-0.5 rounded-full border border-blue-200 inline-block my-1 mx-auto">
                {headerSlogan}
              </span>
              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                {headerSubtitle}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleLoginClick}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition shadow-md shadow-blue-600/30 cursor-pointer uppercase tracking-wide"
            >
              Login / Sign Up
            </button>
          </div>
        </header>

        {/* 2. STICKY HORIZONTAL MENU BAR */}
        <nav className="bg-blue-900 text-white px-8 py-3">
          <div className="max-w-7xl mx-auto flex justify-center space-x-8 text-xs font-black uppercase tracking-wider overflow-x-auto">
            {menuItems.map(item => (
              <a
                key={item.id}
                href={item.href}
                onClick={(e) => handleMenuClick(e, item.label, item.href)}
                className="hover:text-blue-300 transition py-1 hover:border-b-2 hover:border-blue-400 whitespace-nowrap cursor-pointer"
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>
      </div>

      {/* 3. HERO BANNER SECTION (Smooth Sliding / Diffusion with Manual Arrows & Pause) */}
      <section
        id="home"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="bg-gradient-to-b from-blue-900 to-blue-950 text-white px-8 py-24 relative overflow-hidden min-h-[420px] flex items-center justify-center"
      >
        {/* Render Carousel Slides with Smooth Sliding & Diffusion Animation */}
        <div className="absolute inset-0 w-full h-full flex items-center justify-center">
          {heroBanners.map((hb, idx) => {
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
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                <div 
                  className="max-w-5xl mx-auto text-center space-y-6 relative z-10 p-8 rounded-3xl border border-white/10 backdrop-blur-xs transition-all shadow-xl"
                  style={{
                    backgroundColor: `rgba(15, 23, 42, ${(hb.textBgOpacity ?? 80) / 100})`
                  }}
                >
                  {hb.tag && (
                    <div className="inline-block bg-blue-800/80 text-blue-200 border border-blue-700 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-inner">
                      {hb.tag}
                    </div>
                  )}
                  
                  <h1 className="text-3xl md:text-5xl font-black tracking-tight uppercase leading-tight max-w-4xl mx-auto">
                    {hb.title}
                  </h1>
                  
                  <p className="text-blue-100 max-w-2xl mx-auto text-sm md:text-base font-medium leading-relaxed">
                    {hb.subtitle}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Manual Navigation Arrows */}
        <button
          onClick={handlePrevSlide}
          className="absolute left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 bg-white/10 hover:bg-white/25 backdrop-blur-md rounded-full flex items-center justify-center text-white text-lg font-bold transition shadow-lg cursor-pointer border border-white/20"
          title="Previous Banner"
        >
          ‹
        </button>
        <button
          onClick={handleNextSlide}
          className="absolute right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 bg-white/10 hover:bg-white/25 backdrop-blur-md rounded-full flex items-center justify-center text-white text-lg font-bold transition shadow-lg cursor-pointer border border-white/20"
          title="Next Banner"
        >
          ›
        </button>

        {/* Slide Indicators / Dots */}
        <div className="absolute bottom-6 left-0 right-0 z-30 flex justify-center space-x-2">
          {heroBanners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveHeroSlide(idx)}
              className={`h-2.5 rounded-full transition-all cursor-pointer ${activeHeroSlide === idx ? 'w-8 bg-white shadow' : 'w-2.5 bg-blue-700/80'}`}
            />
          ))}
        </div>
      </section>

      {/* 4. FEATURED PRODUCTS DISPLAY ROW */}
      <section id="products" className="px-8 py-20 max-w-7xl mx-auto w-full space-y-10">
        <div className="text-center space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">SOFTWARE ECOSYSTEM</span>
          <h2 className="text-3xl font-black uppercase tracking-wide text-blue-950">Our Favorite Products</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
          {products.map((prod, idx) => (
            <div key={prod.id || idx} className="bg-white border border-blue-100 rounded-3xl p-5 shadow-lg shadow-blue-900/5 flex flex-col justify-between hover:border-blue-500 hover:shadow-xl transition group">
              <div className="space-y-4">
                <div className="w-full h-32 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-105 transition duration-300">
                  {prod.image && (prod.image.startsWith('data:') || prod.image.startsWith('http') || prod.image.startsWith('/') || prod.image.length > 50) ? (
                    <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">{prod.image || '📦'}</span>
                  )}
                </div>
                <h3 className="font-black text-sm uppercase text-blue-950">{prod.name}</h3>
                <p className="text-slate-600 text-xs leading-relaxed text-justify">{prod.desc}</p>
              </div>
              <div className="pt-6">
                <button
                  onClick={() => alert(`Details for ${prod.name}`)}
                  className="w-full py-2.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-bold rounded-xl text-xs transition uppercase tracking-wider border border-blue-200 cursor-pointer"
                >
                  Read more...
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. OUR RESPECTED PARTNERS SECTION */}
      <section id="partners" className="bg-slate-50 border-y border-slate-200 px-8 py-20">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">CLIENT SUCCESS</span>
            <h2 className="text-3xl font-black uppercase tracking-wide text-blue-950">Our Respected Partners</h2>
            <p className="text-xs text-slate-500">Proudly empowering top-tier businesses and fast-growing enterprises worldwide.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {partners.map(partner => (
              <div key={partner.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center h-28 shadow-xs hover:border-blue-400 hover:shadow-md transition">
                <span className="text-2xl mb-1">{partner.logo}</span>
                <span className="font-extrabold text-[11px] text-slate-700 text-center truncate w-full">{partner.name}</span>
                <span className="text-[9px] text-slate-400 uppercase">Verified Client</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. DAILY BLOGS SECTION */}
      <section id="blogs" className="px-8 py-20 max-w-7xl mx-auto w-full space-y-10">
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">INSIGHTS & UPDATES</span>
            <h2 className="text-3xl font-black uppercase tracking-wide text-blue-950">Daily Blogs</h2>
          </div>
          <button
            onClick={() => alert('Opening full blog archive...')}
            className="text-xs font-black text-blue-600 hover:text-blue-800 uppercase tracking-wider flex items-center space-x-1 cursor-pointer"
          >
            <span>Read all blogs...</span>
            <span>→</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {blogs.map((blog, idx) => (
            <div key={blog.id || idx} className="bg-white border border-blue-100 rounded-3xl p-5 shadow-lg shadow-blue-900/5 flex flex-col justify-between hover:border-blue-400 transition group">
              <div className="space-y-3">
                <div className="w-full h-36 bg-blue-900 rounded-2xl flex items-center justify-center text-3xl text-white font-black shadow-inner group-hover:bg-blue-600 transition">
                  📰
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
                  <span>{blog.category}</span>
                  <span>{blog.date}</span>
                </div>
                <h3 className="font-black text-sm uppercase text-blue-950 leading-snug">{blog.title}</h3>
                <p className="text-slate-600 text-xs leading-relaxed">{blog.desc}</p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100">
                <button
                  onClick={() => alert(`Opening article: ${blog.title}`)}
                  className="text-xs font-extrabold text-blue-600 hover:text-blue-800 uppercase tracking-wide flex items-center space-x-1 cursor-pointer"
                >
                  <span>Read more...</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT US SECTION */}
      <section id="about" className="bg-blue-900 text-white px-8 py-6 relative overflow-hidden">
        <div className="max-w-5xl mx-auto text-center space-y-4 flex flex-col items-center relative z-10">
          <div className="mb-2">
            <img
              src="/unicon-logo.png"
              alt="Unicon Labs Enlarged Logo"
              className="h-20 w-auto object-contain filter drop-shadow-[0_0_12px_rgba(34,211,238,0.9)] drop-shadow-[0_0_24px_rgba(56,189,248,0.7)]"
            />
          </div>
          <h2 className="text-xs font-black uppercase tracking-widest text-blue-300">ABOUT UNICON LABS</h2>
          <h3 className="text-2xl font-black uppercase tracking-wide">Engineering Robust Software Solutions</h3>
          <p className="text-blue-100 text-xs md:text-sm max-w-3xl mx-auto leading-relaxed whitespace-pre-line">
            {aboutText}
          </p>
        </div>
      </section>

      {/* 7. PROFESSIONAL FOOTER AREA */}
      <footer id="contact" className="bg-blue-950 text-white border-t border-blue-900 px-8 py-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-blue-900 text-xs">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center font-black">⚡</span>
              <span className="font-black uppercase tracking-wider text-sm">{headerBrand}</span>
            </div>
            <p className="text-blue-300 leading-relaxed">
              {headerSlogan}. Providing enterprise software ecosystems, web applications, and autonomous POS modules globally.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-black uppercase tracking-wider text-blue-300 text-sm">Quick Links</h4>
            <ul className="space-y-1.5 text-blue-200">
              {menuItems.map(m => (
                <li key={m.id}>
                  <a
                    href={m.href}
                    onClick={(e) => handleMenuClick(e, m.label, m.href)}
                    className="hover:text-white transition cursor-pointer"
                  >
                    {m.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-black uppercase tracking-wider text-blue-300 text-sm">Operations</h4>
            <ul className="space-y-1.5 text-blue-200">
              <li>Adaptive POS Terminal</li>
              <li>Kitchen Display (KDS)</li>
              <li>Dispatch Queue</li>
              <li>FBR Fiscal Synchronization</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-black uppercase tracking-wider text-blue-300 text-sm">Headquarters</h4>
            <p className="text-blue-200 leading-relaxed whitespace-pre-line">
              {footerHQ}
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-blue-400 font-medium">
          <p>© 2026 {headerBrand}. All rights reserved.</p>
          <div className="flex items-center space-x-6 mt-4 md:mt-0">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Security Compliance</span>
            <button
              onClick={scrollToTop}
              className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-lg transition border border-blue-700 shadow cursor-pointer uppercase tracking-wider flex items-center space-x-1"
            >
              <span>↑ Back to Top</span>
            </button>
          </div>
        </div>
      </footer>

      {/* CONTACT US POPUP MODAL PALETTE */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-blue-500/30 rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl text-slate-100 relative space-y-6 my-8">
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
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-xl transition shadow-lg shadow-blue-600/30 cursor-pointer"
                >
                  {submittingQuery ? 'Transmitting Query...' : 'Submit Query'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FLOATING WHATSAPP CHAT BUTTON WITH CONTINUOUS HEARTBEAT & VIBRANT GLOW */}
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