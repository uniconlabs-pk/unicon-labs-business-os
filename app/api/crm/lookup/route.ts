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

    // Search globally in the master customers table
    const { data: customers, error: custErr } = await supabase
      .from('customers')
      .select('id, name, phone, email, default_address')
      .or(`phone.ilike.%${rawClean}%,phone.ilike.%${suffix}%`)
      .limit(1)

    if (custErr || !customers || customers.length === 0) {
      return NextResponse.json({ 
        found: false, 
        debug: { businessId: biz.id, searchedSuffix: suffix, dbError: custErr?.message } 
      })
    }

    const matchedCustomer = customers[0]

    // Fetch all saved delivery addresses for this customer globally
    const { data: addresses } = await supabase
      .from('customer_addresses')
      .select('id, address_text, label, is_default')
      .eq('customer_id', matchedCustomer.id)
      .order('is_default', { ascending: false })

    // Return matched global customer with their complete address book
    return NextResponse.json({ 
      found: true, 
      customer: {
        ...matchedCustomer,
        addresses: addresses || []
      } 
    })
  } catch (err: any) {
    return NextResponse.json({ found: false, error: err.message }, { status: 500 })
  }
}