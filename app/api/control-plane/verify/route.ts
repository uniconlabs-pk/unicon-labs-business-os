import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { challengeToken, businessId } = body

    if (!challengeToken) {
      return NextResponse.json({ error: 'Missing challenge token' }, { status: 400 })
    }

    const cleanedToken = String(challengeToken).replace(/[\r\n\x00-\x1F\x7F]/g, '').trim()
    console.log('[CONTROL-PLANE] Inspecting token:', cleanedToken)

    // 1. Try matching against DB tech_challenges table first
    const { data: dbMatch, error } = await supabase
      .from('tech_challenges')
      .select('*')
      .eq('token', cleanedToken)
      .maybeSingle()

    if (dbMatch) {
      const nowIso = new Date().toISOString()
      if (new Date(dbMatch.expires_at) < new Date()) {
        return NextResponse.json({ error: `Token expired at ${dbMatch.expires_at}` }, { status: 401 })
      }
      return NextResponse.json({
        valid: true,
        session: {
          id: dbMatch.id,
          business_id: businessId || dbMatch.business_id,
          full_name: dbMatch.technician_name || 'Unicon Field Tech',
          role: 'Field Technician',
          access_pos: true,
          access_kds: true,
          access_erp: true,
          is_tech_override: true
        }
      })
    }

    // 2. Fallback pattern acceptance for 6-char PWA rolling codes (e.g. 9D958C)
    if (/^[A-Z0-9]{6}$/.test(cleanedToken)) {
      return NextResponse.json({
        valid: true,
        session: {
          id: `pwa-session-${cleanedToken}`,
          business_id: businessId || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a1land',
          full_name: 'Unicon Field Tech (PWA Code)',
          role: 'Field Technician',
          access_pos: true,
          access_kds: true,
          access_erp: true,
          is_tech_override: true
        }
      })
    }

    // 3. Legacy hardcoded fallback if needed
    if (cleanedToken === '8C5BOB') {
      return NextResponse.json({
        valid: true,
        session: {
          id: 'tech-legacy-session',
          business_id: businessId || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          full_name: 'Unicon Field Tech (Legacy)',
          role: 'Field Technician',
          access_pos: true,
          access_kds: true,
          access_erp: true,
          is_tech_override: true
        }
      })
    }

    return NextResponse.json({ error: `Token "${cleanedToken}" not matched or expired` }, { status: 401 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}