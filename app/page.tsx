'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function UniconLabsLandingPage() {
  const router = useRouter()
  const [clientSlugInput, setClientSlugInput] = useState('')
  const [activeHeroSlide, setActiveHeroSlide] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

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
    { id: 1, title: 'POWERING AUTONOMOUS ENTERPRISE ECOSYSTEMS', subtitle: 'Next-generation multi-tenant Business OS designed for scale, speed, and real-time offline sync.', tag: 'FLAGSHIP PLATFORM', bgImage: '' },
    { id: 2, title: 'INTELLIGENT POINT OF SALE & KITCHEN DISPLAY', subtitle: 'Streamline multi-tender settlement, split payments, FBR fiscal integration, and instant KOT ticket routing.', tag: 'OPERATIONAL EXCELLENCE', bgImage: '' },
    { id: 3, title: 'REAL-TIME LOGISTICS & DISPATCH QUEUE', subtitle: 'Effortlessly manage delivery fleets, rider assignments, and automated customer notifications.', tag: 'SUPPLY CHAIN', bgImage: '' },
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

  const handleClientLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientSlugInput.trim()) {
      alert('Please enter your business tenant slug (e.g., krunchy-bite).')
      return
    }
    router.push(`/${clientSlugInput.trim().toLowerCase()}/pos`)
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col font-sans select-none">
      
      {/* 1. SMART STICKY HEADER AREA */}
      <header className="bg-white border-b border-blue-100 px-8 py-3 flex justify-between items-center sticky top-0 z-50 shadow-xs">
        <div className="flex items-center space-x-4">
          <img
            src="/unicorn-logo.png"
            alt="Unicon Labs Logo"
            className="h-12 w-auto object-contain"
          />
          <div className="flex flex-col justify-center">
            <span className="text-xl font-black tracking-wider text-[#1e293b] leading-tight">
              UNICON LABS
            </span>
            <span className="text-xs text-slate-600 font-medium tracking-normal lowercase">
              you think we build
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push('/master-admin')}
            className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-xs transition border border-blue-200 shadow-2xs cursor-pointer"
          >
            🛡️ Master Admin
          </button>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="tenant-slug..."
              value={clientSlugInput}
              onChange={e => setClientSlugInput(e.target.value)}
              className="w-36 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-600"
            />
            <button
              onClick={handleClientLogin}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition shadow-md shadow-blue-600/30 cursor-pointer uppercase tracking-wide"
            >
              Login / Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* 2. STICKY HORIZONTAL MENU BAR */}
      <nav className="bg-blue-900 text-white px-8 py-3 sticky top-[73px] z-40 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-center md:justify-start space-x-8 text-xs font-black uppercase tracking-wider overflow-x-auto">
          {menuItems.map(item => (
            <a key={item.id} href={item.href} className="hover:text-blue-300 transition py-1 hover:border-b-2 hover:border-blue-400 whitespace-nowrap">
              {item.label}
            </a>
          ))}
        </div>
      </nav>

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
                  backgroundImage: hb.bgImage ? `linear-gradient(rgba(15, 23, 42, 0.82), rgba(15, 23, 42, 0.88)), url('${hb.bgImage}')` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
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
                <div className="w-full h-32 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-center text-4xl shadow-inner group-hover:scale-105 transition duration-300">
                  {prod.image}
                </div>
                <h3 className="font-black text-sm uppercase text-blue-950">{prod.name}</h3>
                <p className="text-slate-600 text-xs leading-relaxed">{prod.desc}</p>
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
      <section id="about" className="bg-blue-900 text-white px-8 py-16">
        <div className="max-w-5xl mx-auto text-center space-y-4">
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
                <li key={m.id}><a href={m.href} className="hover:text-white transition">{m.label}</a></li>
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
          <div className="flex space-x-6 mt-4 md:mt-0">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Security Compliance</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
