import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get('slug')
    const phone = searchParams.get('phone')

    if (!slug || !phone) {
      return NextResponse.json({ found: false, error: 'Missing slug or phone' }, { status: 400 })
    }

    const { data: biz, error: bizErr } = await supabase
      .from('businesses')
      .select('id')
      .eq('slug', slug)
      .single()

    if (bizErr || !biz) {
      return NextResponse.json({ found: false, error: 'Business not found for slug ' + slug }, { status: 404 })
    }

    const rawClean = phone.replace(/\D/g, '')
    if (rawClean.length < 7) {
      return NextResponse.json({ found: false, debug: 'phone too short' })
    }

    const suffix = rawClean.slice(-10)

    const { data: customers, error: custErr } = await supabase
      .from('customers')
      .select('id, name, phone, email, default_address, business_id')
      .eq('business_id', biz.id)
      .or(`phone.ilike.%${rawClean}%,phone.ilike.%${suffix}%`)
      .limit(1)

    if (custErr || !customers || customers.length === 0) {
      return NextResponse.json({ 
        found: false, 
        debug: { businessId: biz.id, searchedSuffix: suffix, dbError: custErr?.message } 
      })
    }

    return NextResponse.json({ found: true, customer: customers[0] })
  } catch (err: any) {
    return NextResponse.json({ found: false, error: err.message }, { status: 500 })
  }
}