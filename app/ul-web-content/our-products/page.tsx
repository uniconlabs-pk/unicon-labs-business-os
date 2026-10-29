'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function ProductLandingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = searchParams.get('id')

  const [product, setProduct] = useState<any>(null)
  const [remainingProducts, setRemainingProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchProductDetails() {
      setIsLoading(true)
      const { data: allProducts } = await supabase
        .from('unicon_global_settings')
        .select('settings')
        .eq('id', 'main')
        .maybeSingle()

      if (allProducts && allProducts.settings && allProducts.settings.products) {
        const prods = allProducts.settings.products
        const found = prods.find((p: any) => String(p.id) === String(productId)) || prods[0]
        
        setProduct(found)
        setRemainingProducts(prods.filter((p: any) => String(p.id) !== String(found?.id)))
      }
      setIsLoading(false)
    }

    fetchProductDetails()
  }, [productId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-300 font-mono text-xs">
        Loading product specification...
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4 text-white">
        <p className="text-sm">Product not found.</p>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-blue-600 rounded-xl text-xs font-bold cursor-pointer"
        >
          Return to Home
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      
      {/* TOP NAVIGATION / BACK BAR */}
      <div className="bg-slate-900 border-b border-cyan-500/20 px-4 md:px-8 py-4 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition cursor-pointer uppercase tracking-wider"
          >
            ← Back to UNICON LABS Home
          </button>
          <span className="text-xs font-mono text-cyan-300 uppercase tracking-widest font-black">
            Independent Product Landing Page
          </span>
        </div>
      </div>

      {/* MAIN PRODUCT DETAIL VIEW */}
      <main className="flex-1 px-4 md:px-8 py-12 max-w-6xl mx-auto w-full space-y-12">
        <div className="bg-slate-900/90 border border-cyan-500/40 rounded-3xl p-6 md:p-10 shadow-2xl space-y-8 backdrop-blur-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="w-full h-72 md:h-96 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden shadow-inner">
              {product.image && (product.image.startsWith('data:') || product.image.startsWith('http') || product.image.startsWith('/') || product.image.length > 50) ? (
                <img 
                  src={product.image.startsWith('data:') && !product.image.includes('base64,') ? `data:image/jpeg;base64,${product.image}` : product.image} 
                  alt={product.name} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <span className="text-6xl">{product.image || '📦'}</span>
              )}
            </div>
            <div className="space-y-4">
              <h1 className="text-2xl md:text-4xl font-black uppercase tracking-wide text-cyan-300">
                {product.name}
              </h1>
              <p className="text-blue-100 text-sm md:text-base leading-relaxed text-justify">
                {product.desc}
              </p>
              <div className="pt-4">
                <button
                  onClick={() => router.push('/#contact')}
                  className="px-6 py-3 bg-blue-600 hover:bg-cyan-500 text-white font-black text-xs rounded-xl transition uppercase tracking-wider cursor-pointer shadow-lg shadow-blue-600/30"
                >
                  Inquire About This Product
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PRODUCT FOOTER: REMAINING PRODUCTS LINKS FOR FURTHER NAVIGATION */}
        <div className="bg-slate-900/90 border border-blue-500/30 rounded-3xl p-6 md:p-8 space-y-4 shadow-xl">
          <h3 className="text-sm font-black uppercase text-cyan-300 tracking-wider">
            Explore Other Products & Modules:
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {remainingProducts.map((otherProd, idx) => (
              <button
                key={otherProd.id || idx}
                onClick={() => {
                  router.push(`/ul-web-content/our-products?id=${otherProd.id}`)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className="p-3 bg-slate-950 border border-slate-800 hover:border-cyan-400 rounded-2xl text-left transition cursor-pointer group flex flex-col justify-between"
              >
                <span className="font-bold text-xs text-white group-hover:text-cyan-300 truncate w-full">
                  {otherProd.name}
                </span>
                <span className="text-[10px] text-blue-400 mt-1 font-semibold">View details →</span>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}