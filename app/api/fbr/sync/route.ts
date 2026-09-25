// app/api/fbr/sync/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  try {
    const { orderId, slug } = await req.json()

    if (!orderId || !slug) {
      return NextResponse.json({ error: 'Missing orderId or slug' }, { status: 400 })
    }

    // 1. Fetch order details
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // 2. Fetch business configuration for FBR credentials/POS ID
    const { data: business, error: bizErr } = await supabase
      .from('businesses')
      .select('id, fbr_pos_id, fbr_integration_enabled, enable_fbr_integration')
      .eq('slug', slug)
      .single()

    if (bizErr || !business) {
      return NextResponse.json({ error: 'Business config not found' }, { status: 404 })
    }

    const isFbrActive = 
      Boolean(business.enable_fbr_integration || business.fbr_integration_enabled) &&
      Boolean(business.fbr_pos_id)

    if (!isFbrActive) {
      return NextResponse.json({ message: 'FBR integration inactive for this tenant, skipping sync.' }, { status: 200 })
    }

    // 3. Construct FBR payload (adjust structure per FBR IMS v3 specifications)
    const fbrPayload = {
      invoiceNumber: order.id.slice(0, 16),
      posId: business.fbr_pos_id,
      totalBillAmount: order.total,
      totalQuantity: order.items?.reduce((acc: number, item: any) => acc + (item.qty || 1), 0) || 1,
      totalSaleValue: order.subtotal,
      totalTaxCharged: order.gst_amount,
      paymentMode: 1, // 1 for Cash, etc.
      invoiceDate: new Date(order.created_at || Date.now()).toISOString().split('T')[0],
      items: order.items?.map((item: any) => ({
        itemCode: item.id || 'GEN-01',
        itemName: item.name,
        itemQuantity: item.qty || 1,
        saleValue: (item.finalUnitPrice || item.price) * (item.qty || 1),
        taxCharged: item.gstAmount || 0,
        totalAmount: (item.finalUnitPrice || item.price) * (item.qty || 1)
      })) || []
    }

    // 4. Send request to FBR API (Sandbox/Live via env)
    const fbrEndpoint = process.env.FBR_API_ENDPOINT || 'https://gw.fbr.gov.pk/imsv3/api/common/v1/extract'
    const fbrToken = process.env.FBR_BEARER_TOKEN || ''

    let syncStatus = 'synced'
    let fbrInvoiceNumber = null

    try {
      const fbrRes = await fetch(fbrEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(fbrToken ? { 'Authorization': `Bearer ${fbrToken}` } : {})
        },
        body: JSON.stringify(fbrPayload)
      })

      if (!fbrRes.ok) {
        throw new Error(`FBR API returned status ${fbrRes.status}`)
      }

      const fbrData = await fbrRes.json()
      fbrInvoiceNumber = fbrData?.InvoiceNumber || fbrData?.invoiceNumber || null
    } catch (apiErr) {
      console.warn('FBR live push warning (proceeding with local queue/fallback):', apiErr)
      syncStatus = 'fbr_pending_retry'
    }

    // 5. Update order fiscal status in Supabase
    await supabase
      .from('orders')
      .update({
        fiscal_status: syncStatus,
        fbr_invoice_number: fbrInvoiceNumber,
        synced_at: new Date().toISOString()
      })
      .eq('id', orderId)

    return NextResponse.json({ success: true, fiscal_status: syncStatus, fbrInvoiceNumber })
  } catch (err: any) {
    console.error('FBR sync route error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}