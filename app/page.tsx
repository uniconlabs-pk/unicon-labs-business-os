'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UniconLabsLandingPage() {
  const router = useRouter()
  const [clientSlugInput, setClientSlugInput] = useState('')

  const handleClientLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientSlugInput.trim()) {
      alert('Please enter your business tenant slug (e.g., krunchy-bite).')
      return
    }
    router.push(`/${clientSlugInput.trim().toLowerCase()}/pos`)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      
      {/* NAVIGATION BAR */}
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-8 py-5 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-900/40">
            ⚡
          </div>
          <div>
            <span className="text-base font-black tracking-wider uppercase bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              UNICON LABS
            </span>
            <span className="block text-[9px] text-emerald-400 font-bold uppercase tracking-widest">Enterprise Software Ecosystem</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/master-admin')}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl font-bold text-xs transition border border-slate-700 shadow-sm cursor-pointer"
          >
            🛡️ Master Admin Portal
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="px-8 py-20 max-w-6xl mx-auto text-center space-y-6">
        <div className="inline-block bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest animate-pulse">
          🚀 Next-Generation Multi-Tenant Business OS
        </div>
        
        <h1 className="text-4xl md:text-6xl font-black tracking-tight uppercase leading-tight">
          Powering Digital Ecosystems & <span className="text-emerald-500">Autonomous POS Operations</span>
        </h1>
        
        <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base font-medium leading-relaxed">
          Unicon Labs delivers robust software infrastructure—providing advanced POS terminals, Kitchen Display Systems (KDS), real-time delivery dispatch queues, and offline synchronization modules.
        </p>

        {/* QUICK CLIENT WORKSPACE ACCESS BAR */}
        <div className="pt-6 max-w-md mx-auto">
          <form onSubmit={handleClientLogin} className="bg-slate-900 border border-slate-800 p-2 rounded-2xl flex items-center shadow-2xl">
            <span className="pl-3 text-slate-500 font-mono text-xs">unicon-labs.com/</span>
            <input
              type="text"
              placeholder="enter-tenant-slug (e.g. krunchy-bite)"
              value={clientSlugInput}
              onChange={e => setClientSlugInput(e.target.value)}
              className="flex-1 bg-transparent px-2 py-2 text-xs font-mono text-white focus:outline-none placeholder:text-slate-600"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-emerald-600/30 cursor-pointer"
            >
              Access POS →
            </button>
          </form>
          <p className="text-[10px] text-slate-500 mt-2 font-medium">Enter your registered business slug to launch your operational terminal.</p>
        </div>
      </section>

      {/* MODULES SHOWCASE GRID */}
      <section className="px-8 py-16 max-w-6xl mx-auto w-full space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-xs font-black uppercase tracking-widest text-emerald-400">Integrated Architecture</h2>
          <h3 className="text-2xl font-black uppercase tracking-wide">Core Operational Modules</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl space-y-3 hover:border-slate-700 transition">
            <div className="w-12 h-12 bg-emerald-950 text-emerald-400 rounded-2xl flex items-center justify-center text-xl font-black border border-emerald-800/50">
              ⚡
            </div>
            <h4 className="font-black text-sm uppercase text-white">Adaptive POS Terminal</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Multi-tender settlement, split payment options, FBR fiscal integration, invoice recall, and secure manager PIN/QR returns.
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl space-y-3 hover:border-slate-700 transition">
            <div className="w-12 h-12 bg-amber-950 text-amber-400 rounded-2xl flex items-center justify-center text-xl font-black border border-amber-800/50">
              🍔
            </div>
            <h4 className="font-black text-sm uppercase text-white">Kitchen Display System (KDS)</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Real-time digital ticket routing, audio-visual order alerts, modifier tracking, and speed-of-service performance timers.
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl space-y-3 hover:border-slate-700 transition">
            <div className="w-12 h-12 bg-blue-950 text-blue-400 rounded-2xl flex items-center justify-center text-xl font-black border border-blue-800/50">
              📦
            </div>
            <h4 className="font-black text-sm uppercase text-white">Dispatch & Fulfillment Queue</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Dedicated logistics management, in-house and third-party rider assignment, and automated WhatsApp delivery notifications.
            </p>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 px-8 py-6 text-center text-xs text-slate-500 font-medium">
        <p>© 2026 UNICON LABS. All rights reserved. Operating high-performance software ecosystems globally.</p>
      </footer>

    </div>
  )
}