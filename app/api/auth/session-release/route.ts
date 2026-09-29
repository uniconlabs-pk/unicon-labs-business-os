import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  try {
    let body;
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      body = await req.json()
    } else {
      // Handle text/plain or beacon payloads
      const text = await req.text()
      body = text ? JSON.parse(text) : {}
    }

    const { businessId, staffId } = body

    if (!businessId || !staffId) {
      return NextResponse.json({ error: 'Missing businessId or staffId' }, { status: 400 })
    }

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

    // Delete the active session row to free up the seat/user
    const { error } = await supabase
      .from('active_pos_sessions')
      .delete()
      .eq('business_id', resolvedBusinessId)
      .eq('staff_id', staffId)

    if (error) {
      return NextResponse.json({ error: 'Failed to release session: ' + error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Session released successfully' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}