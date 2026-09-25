import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { businessId, pin, requiredModule } = body

    if (!businessId || pin === undefined || pin === null || pin === '') {
      return NextResponse.json({ error: 'Missing businessId or PIN/Badge code' }, { status: 400 })
    }

    const cleanedInput = String(pin).replace(/[\r\n\x00-\x1F\x7F]/g, '').trim()

    // Resolve business UUID if slug was passed
    let resolvedBusinessId = businessId
    const { data: bizMatch } = await supabase
      .from('businesses')
      .select('id')
      .or(`id.eq.${businessId},slug.eq.${businessId}`)
      .single()

    if (bizMatch) {
      resolvedBusinessId = bizMatch.id
    }

    const { data: staffList, error } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('business_id', resolvedBusinessId)

    if (error) {
      return NextResponse.json({ error: 'Database query failed: ' + error.message }, { status: 500 })
    }

    if (!staffList || staffList.length === 0) {
      return NextResponse.json({ error: `No staff profiles found for workspace: ${resolvedBusinessId}` }, { status: 401 })
    }

    const staff = staffList.find((s: any) => {
      const matchPin = s.pin_code && String(s.pin_code).trim() === cleanedInput
      const matchQr = s.qr_token && String(s.qr_token).trim() === cleanedInput
      const matchCode = s.staff_code && String(s.staff_code).trim() === cleanedInput
      return matchPin || matchQr || matchCode
    })

    if (!staff) {
      return NextResponse.json({ error: `PIN/Badge not matched for input: "${cleanedInput}"` }, { status: 401 })
    }

    if (requiredModule === 'pos' && staff.access_pos === false) {
      return NextResponse.json({ error: 'Staff member lacks POS module permission' }, { status: 403 })
    }
    if (requiredModule === 'kds' && staff.access_kds === false) {
      return NextResponse.json({ error: 'Staff member lacks KDS module permission' }, { status: 403 })
    }

    return NextResponse.json({
      valid: true,
      staff: {
        id: staff.id,
        business_id: staff.business_id,
        full_name: staff.full_name || 'Staff',
        role: staff.role || 'Cashier',
        access_pos: staff.access_pos ?? true,
        access_kds: staff.access_kds ?? false,
        access_erp: staff.access_erp ?? false,
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}