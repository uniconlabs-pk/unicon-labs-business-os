import { NextResponse } from 'next/server'
import crypto from 'crypto'

const CONTROL_PLANE_SECRET = process.env.CONTROL_PLANE_SECRET || 'unicon-labs-master-control-secret-key-2026'

export async function POST(req: Request) {
  try {
    const { techId, businessId, actionType = 'DIAG_ACCESS' } = await req.json()

    if (!techId || !businessId) {
      return NextResponse.json({ error: 'Missing techId or businessId' }, { status: 400 })
    }

    const timestamp = Date.now()
    const expiry = timestamp + 5 * 60 * 1000 // 5 minutes TTL
    const nonce = crypto.randomBytes(8).toString('hex')

    // Create HMAC signature
    const payload = `${techId}:${businessId}:${actionType}:${timestamp}:${expiry}:${nonce}`
    const signature = crypto
      .createHmac('sha256', CONTROL_PLANE_SECRET)
      .update(payload)
      .digest('hex')

    const challengeToken = Buffer.from(JSON.stringify({
      techId,
      businessId,
      actionType,
      timestamp,
      expiry,
      nonce,
      signature
    })).toString('base64')

    return NextResponse.json({
      success: true,
      challengeToken,
      expiresAt: new Date(expiry).toISOString(),
      displayCode: nonce.toUpperCase().slice(0, 6) // Fallback 6-char OTP
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}