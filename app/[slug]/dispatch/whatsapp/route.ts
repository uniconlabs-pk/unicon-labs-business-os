import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  try {
    const { orderId, slug } = await req.json()

    if (!orderId || !slug) {
      return NextResponse.json({ success: false, error: 'Missing orderId or slug' }, { status: 400 })
    }

    // 1. Fetch Order & Business Details from Supabase
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderErr || !order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    const { data: business, error: bizErr } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', order.business_id)
      .single()

    if (bizErr || !business) {
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 })
    }

    // 2. Prepare WhatsApp Message Payload
    const customerPhone = order.customer_phone ? order.customer_phone.replace(/\D/g, '') : ''
    if (!customerPhone) {
      return NextResponse.json({ success: false, error: 'Customer phone number missing' }, { status: 400 })
    }

    const orderNumberStr = order.order_number ? `KB-${String(order.order_number).padStart(6, '0')}` : 'Delivery Order'
    const riderName = order.rider_name || 'Assigned Rider'
    const riderPhone = order.rider_phone || 'N/A'
    const grandTotal = Number(order.total_amount || 0).toLocaleString()
    const currency = business.currency_symbol || 'Rs.'

    const messageBody = `📦 *${business.name}* - Order Dispatched!\n\n` +
      `Hello *${order.customer_name || 'Valued Customer'}*,\n` +
      `Your order *${orderNumberStr}* is now *Out for Delivery*! 🛵\n\n` +
      `👤 *Assigned Rider:* ${riderName} (${riderPhone})\n` +
      `📍 *Delivery Address:* ${order.delivery_address || 'Provided Address'}\n` +
      `💳 *Payment Mode:* ${order.payment_method || 'CASH ON DELIVERY'}\n` +
      `💰 *Total Payable:* ${currency} ${grandTotal}\n\n` +
      `Thank you for ordering with us! Enjoy your meal. 🎉`

    // 3. Dispatch via UNICON Master WhatsApp Gateway (Example using Meta Cloud API)
    const whatsappToken = process.env.WHATSAPP_API_TOKEN || ''
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || ''

    if (whatsappToken && phoneNumberId) {
      const waResponse = await fetch(`https://graph.facebook.com/v17.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: customerPhone,
          type: 'text',
          text: { body: messageBody }
        })
      })

      const waJson = await waResponse.json()
      if (!waResponse.ok) {
        console.warn('WhatsApp API gateway warning:', waJson)
      }
    } else {
      console.log('--- MOCK WHATSAPP NOTIFICATION SENT ---')
      console.log(`To: +${customerPhone}`)
      console.log(messageBody)
      console.log('---------------------------------------')
    }

    return NextResponse.json({ success: true, message: 'WhatsApp dispatch notification triggered successfully' })
  } catch (err: any) {
    console.error('WhatsApp dispatch API error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}