'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default function TenantLayout({ children, params }: LayoutProps) {
  const { slug } = use(params)
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [business, setBusiness] = useState<any>(null)
  const [isSuspended, setIsSuspended] = useState(false)

  useEffect(() => {
    async function verifyTenantAccess() {
      if (!slug) return

      const { data: biz, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .single()

      if (error || !biz) {
        router.push('/')
        return
      }

      setBusiness(biz)

      // Check if the tenant is suspended globally
      if (biz.subscription_status === 'suspended') {
        setIsSuspended(true)
      } else {
        setIsSuspended(false)
      }

      setLoading(false)
    }

    verifyTenantAccess()
  }, [slug, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center font-mono text-xs">
        <div className="space-y-2 text-center animate-pulse">
          <div>⚡ Verifying Tenant Security & Subscription Status...</div>
        </div>
      </div>
    )
  }

  // GLOBAL SUSPENSION GUARD: Completely blocks access to all sub-routes & pages if suspended
  if (isSuspended) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4 font-sans select-none">
        <div className="bg-red-950/40 border border-red-900/60 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl backdrop-blur-md">
          <div className="w-16 h-16 bg-red-600 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg">
            🚫
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-black uppercase tracking-wider text-red-400">Account Suspended</h1>
            <p className="text-xs text-gray-300">
              The store <span className="font-bold text-white">{business?.name || slug}</span> has been temporarily suspended by the Master Administrator. Direct access to all modules and sub-pages is locked.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => {
                localStorage.removeItem(`tenant_session_${slug}`)
                sessionStorage.removeItem(`unicon_staff_session_${slug}`)
                router.push(`/${slug}/login`)
              }}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition shadow cursor-pointer"
            >
              Sign Out & Return Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}