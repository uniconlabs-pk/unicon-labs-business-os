'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function TenantLoginPage({ params }: PageProps) {
  const { slug } = use(params)
  const router = useRouter()

  const [business, setBusiness] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  useEffect(() => {
    async function fetchBusiness() {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .single()

      if (data) {
        setBusiness(data)
        // Dynamically set browser tab title to "Login - [Tenant Name]"
        if (data.name) {
          document.title = `Login - ${data.name}`
        }
      }
      setLoading(false)
    }
    fetchBusiness()
  }, [slug])

  const handleTenantLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) return alert('Please enter both username and password.')

    setAuthLoading(true)

    // 1. Fetch business ID for this slug
    const { data: bizData } = await supabase
      .from('businesses')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!bizData) {
      alert('Tenant business not found.')
      setAuthLoading(false)
      return
    }

    // 2. Check tenant_users credentials
    const { data: userData, error } = await supabase
      .from('tenant_users')
      .select('*')
      .eq('business_id', bizData.id)
      .eq('username', username.trim())
      .single()

    if (error || !userData || userData.password_hash !== password) {
      alert('Invalid store username or password.')
      setAuthLoading(false)
      return
    }

    // 3. Save session in localStorage and redirect to dashboard
    localStorage.setItem(`tenant_session_${slug}`, JSON.stringify({
      username: userData.username,
      role: userData.role,
      logged_in: true
    }))

    setAuthLoading(false)
    router.push(`/${slug}`)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white text-lg">Loading Login Portal...</div>
  }

  if (!business) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white text-lg text-red-400">Store Not Found</div>
  }

  const primaryColor = business.primary_color || '#059669'

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4 font-sans">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6">
        
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-inner border border-gray-700 overflow-hidden p-2">
            {business.logo_url && business.logo_url.trim() !== '' ? (
              <img 
                src={business.logo_url} 
                alt={`${business.name} Logo`} 
                className="w-full h-full object-contain" 
                onError={(e)=>{
                  const parent = (e.target as HTMLElement).parentElement;
                  if (parent) parent.innerHTML = '<span>🏢</span>';
                }}
              />
            ) : (
              <span>🏢</span>
            )}
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-wide text-white">{business.name}</h1>
            <p className="text-xs text-gray-400 uppercase tracking-widest mt-0.5">Store Management Portal</p>
          </div>
        </div>

        <form onSubmit={handleTenantLogin} className="space-y-4 text-xs">
          <div>
            <label className="block text-gray-400 font-medium mb-1">Store Username</label>
            <input 
              type="text" 
              placeholder="e.g. manager" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
              required 
            />
          </div>
          <div>
            <label className="block text-gray-400 font-medium mb-1">Password</label>
            <input 
              type="password" 
              placeholder="••••••••••••" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
              required 
            />
          </div>
          <button 
            type="submit" 
            disabled={authLoading}
            className="w-full py-3 text-white font-bold rounded-xl transition shadow-lg text-sm"
            style={{ backgroundColor: primaryColor }}
          >
            {authLoading ? 'Signing In...' : 'Sign In to Store'}
          </button>
        </form>

        <div className="text-center pt-2">
          <a href={`/${slug}`} className="text-xs text-gray-500 hover:text-gray-300 transition">← Return to Store Home</a>
        </div>
      </div>
    </div>
  )
}