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

    // Resolve business UUID & fetch seat limit if slug was passed
    let resolvedBusinessId = businessId
    const { data: bizMatch, error: bizErr } = await supabase
      .from('businesses')
      .select('id, pos_seat_limit')
      .or(`id.eq.${businessId},slug.eq.${businessId}`)
      .single()

    if (bizErr || !bizMatch) {
      return NextResponse.json({ error: 'Business workspace not found: ' + (bizErr?.message || '') }, { status: 404 })
    }

    resolvedBusinessId = bizMatch.id
    const seatLimit = bizMatch.pos_seat_limit ?? 1

    const { data: staffList, error: staffErr } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('business_id', resolvedBusinessId)

    if (staffErr) {
      return NextResponse.json({ error: 'Database query failed: ' + staffErr.message }, { status: 500 })
    }

    if (!staffList || staffList.length === 0) {
      return NextResponse.json({ error: `No staff profiles found for workspace: ${resolvedBusinessId}` }, { status: 401 })
    }

    const staff = staffList.find((s: any) => {
      const matchPin = s.pin_code && String(s.pin_code).trim() === cleanedInput
      const matchQr = s.qr_token && String(s.qr_token).trim().toLowerCase() === cleanedInput.toLowerCase()
      const matchCode = s.staff_code && String(s.staff_code).trim().toLowerCase() === cleanedInput.toLowerCase()
      const matchBadgeId = s.badge_id && String(s.badge_id).trim().toLowerCase() === cleanedInput.toLowerCase()
      const matchBadgeCode = s.badge_code && String(s.badge_code).trim().toLowerCase() === cleanedInput.toLowerCase()
      const matchBadgeString = s.badge_string && String(s.badge_string).trim().toLowerCase() === cleanedInput.toLowerCase()
      return matchPin || matchQr || matchCode || matchBadgeId || matchBadgeCode || matchBadgeString
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

    // --- CONCERN NO. 1: Strict Single Active Session Per User Check ---
  const { data: existingUserSession, error: fetchSessionErr } = await supabase
    .from('active_pos_sessions')
    .select('*')
    .eq('business_id', resolvedBusinessId)
    .eq('staff_id', staff.id)
    .maybeSingle()

  if (existingUserSession) {
    return NextResponse.json({
      error: 'This user is already logged in or using the POS Terminal, right now you are not allowed to log-in. Please close the existing session and try again.'
    }, { status: 409 })
  }

    // --- CONCERN NO. 2: POS Seat Limit Licensing Check ---
    const { count: activeSessionsCount, error: countErr } = await supabase
      .from('active_pos_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', resolvedBusinessId)

    if (countErr) {
      console.warn('Active session count error:', countErr.message)
    }

    if ((activeSessionsCount || 0) >= seatLimit) {
      return NextResponse.json({
        error: `POS Terminal seat limit reached (${activeSessionsCount}/${seatLimit} active seats). Please log out an existing terminal or contact UNICON LABS to assign additional seats.`
      }, { status: 403 })
    }

    // Register new active session explicitly with error capture
    const { error: upsertErr } = await supabase.from('active_pos_sessions').upsert({
      business_id: resolvedBusinessId,
      staff_id: staff.id,
      last_heartbeat_at: new Date().toISOString()
    }, {
      onConflict: 'business_id,staff_id'
    })

    if (upsertErr) {
      console.error('Failed to insert active POS session:', upsertErr.message)
      return NextResponse.json({ error: 'Failed to initialize session tracking: ' + upsertErr.message }, { status: 500 })
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
    console.error('PIN Verify critical exception:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}