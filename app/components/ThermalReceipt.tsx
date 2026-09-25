'use client'

import React from 'react'

interface ThermalReceiptProps {
  business: {
    name: string
    address?: string
    phone?: string
    email?: string
    strn?: string
    currency_symbol?: string
    feedback_url?: string
    slug?: string
  }
  order: {
    id: string
    serial_number?: string
    created_at: string
    total_amount: number
    subtotal?: number
    tax_amount?: number
    delivery_charges?: number
    discount?: number
    payment_breakdown?: { method: string; amount: number }[]
    order_type?: string
    table?: string
    waiter?: string
    rider?: string
    customer_note?: string
    cashier_name?: string
    cash_received?: number
    change_returned?: number
  }
  cart: {
    name: string
    finalUnitPrice: number
    quantity: number
    selectedModifiers?: { groupName: string; optionName: string; price: number }[]
  }[]
  customer?: {
    name: string
    phone: string
    address?: string
  } | null
}

function numberToWords(num: number): string {
  if (num === 0) return 'zero'
  
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

  const convertBelowThousand = (n: number): string => {
    if (n === 0) return ''
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '')
    return ones[Math.floor(n / 100)] + ' hundred' + (n % 100 !== 0 ? ' and ' + convertBelowThousand(n % 100) : '')
  }

  const rounded = Math.floor(num)
  if (rounded === 0) return 'zero'

  let result = ''
  const thousands = Math.floor(rounded / 1000)
  const remainder = rounded % 1000

  if (thousands > 0) {
    result += convertBelowThousand(thousands) + ' thousand'
    if (remainder > 0) {
      result += ' ' + convertBelowThousand(remainder)
    }
  } else {
    result += convertBelowThousand(remainder)
  }

  return result
}

export default function ThermalReceipt({ business, order, cart, customer }: ThermalReceiptProps) {
  const currency = business.currency_symbol || 'Rs.'
  const slug = business.slug || 'krunchy-bite'
  
  const orderIdShort = order.id ? order.id : 'POS-1001'
  const serialNumberText = order.serial_number || `SN-${order.id ? order.id.slice(0, 8).toUpperCase() : '1001'}`
  
  const isDelivery = order.order_type?.toLowerCase() === 'delivery'
  const subtotal = order.subtotal || cart.reduce((sum, item) => sum + (item.finalUnitPrice * item.quantity), 0)
  const deliveryCharges = isDelivery ? (order.delivery_charges || 200) : 0
  const taxAmount = order.tax_amount || 0
  const discount = order.discount || 0
  const grandTotal = subtotal + deliveryCharges + taxAmount - discount

  const paymentMethod = order.payment_breakdown?.[0]?.method || 'Cash On Delivery (COD)'
  const isCashPayment = paymentMethod.toUpperCase().includes('CASH')
  const isCOD = paymentMethod.toUpperCase().includes('CASH ON DELIVERY')

  const customerName = customer && customer.name && customer.name !== 'Walk-In Customer' ? customer.name : 'Walk-In Customer'
  const customerPhone = customer && customer.phone && customer.phone !== 'Walk-In' ? customer.phone : 'N/A'

  const amountInWords = `Rupees ${numberToWords(grandTotal)} only.`
  const formatPrice = (val: number) => val.toLocaleString('en-PK', { minimumFractionDigits: 0 })

  const cashReceivedVal = order.cash_received !== undefined ? order.cash_received : (isCashPayment ? grandTotal : 0)
  const changeReturnedVal = order.change_returned !== undefined ? order.change_returned : 0

  return (
    <div className="w-[80mm] m-0 p-2 bg-white text-black font-sans text-[11px] leading-tight select-none">
      
      {/* 1. Brand Thermal Logo & Header */}
      <div className="text-center mb-1">
        <img 
          src={`/tenants/${slug}/logo-thermal.png`} 
          alt="Thermal Logo" 
          className="w-40 h-40 mx-auto object-contain mb-1 grayscale contrast-200" 
        />
        <h1 className="font-black text-base tracking-wider uppercase text-black">{business.name}</h1>
        <div className="bg-black text-white text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest inline-block my-0.5">
          TASTY - JUICY - SPICY
        </div>
        {business.address && <p className="text-[10px] mt-0.5 leading-snug">{business.address}</p>}
        <p className="text-[10px] leading-snug">
          {business.email ? `E-mail: ${business.email}` : ''} {business.phone ? `/ WhatsApp: ${business.phone}` : ''}
        </p>
        {business.strn && <p className="text-[10px] font-semibold mt-0.5">STRN # {business.strn}</p>}
      </div>

      <div className="text-center font-black text-2xl border-t-2 border-b-2 border-black py-2 my-2 uppercase tracking-widest">
        SALE RECEIPT
      </div>

      {/* 2. Order Metadata & Serial Token */}
      <div className="space-y-0.5 mb-2 pb-1.5 border-b border-black text-[11px]">
        <div className="flex justify-between font-bold">
          <span>Serial Number:</span>
          <span className="font-mono">{serialNumberText}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">Date/Time:</span>
          <span className="font-mono">{new Date(order.created_at || Date.now()).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">Order Number:</span>
          <span className="font-mono font-bold">{orderIdShort}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">Merchant Name:</span>
          <span>{order.cashier_name || 'Sheraz Aftab'}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">Payment Mode:</span>
          <span>{paymentMethod}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">Order Type:</span>
          <span className="capitalize">{order.order_type || 'Delivery'}</span>
        </div>
        {order.table && (
          <div className="flex justify-between">
            <span className="font-semibold">Table:</span>
            <span className="font-bold">{order.table}</span>
          </div>
        )}
        {order.waiter && (
          <div className="flex justify-between">
            <span className="font-semibold">Waiter Name:</span>
            <span className="font-bold">{order.waiter}</span>
          </div>
        )}
        {order.rider && (
          <div className="flex justify-between">
            <span className="font-semibold">Assigned Rider:</span>
            <span>{order.rider}</span>
          </div>
        )}
      </div>

      {/* 3. Customer Details */}
      <div className="mb-2 pb-1.5 border-b border-black space-y-0.5 text-[11px]">
        <p className="font-black uppercase tracking-wider mb-0.5 text-black text-xs">CUSTOMER DETAIL</p>
        <div className="border-b border-black pb-1 mb-1">
          <div className="flex">
            <span className="w-28 font-semibold">Customer Name:</span>
            <span className="flex-1 font-bold">{customerName}</span>
          </div>
          <div className="flex">
            <span className="w-28 font-semibold">Contact Number:</span>
            <span className="flex-1 font-mono">{customerPhone}</span>
          </div>
          {isDelivery && customer?.address && (
            <div className="flex mt-0.5">
              <span className="w-28 font-semibold shrink-0">Delivery Address:</span>
              <span className="flex-1 leading-snug">{customer.address}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Order Items Detail */}
      <div className="mb-2 pb-1.5 border-b border-black text-[11px]">
        <p className="font-black uppercase tracking-wider text-xs mb-1">ORDER DETAIL</p>
        <div className="flex justify-between font-black text-[11px] border-b border-dotted border-black pb-0.5 mb-1">
          <span>ITEM DESCRIPTION</span>
          <span>PRICE</span>
        </div>

        {cart.map((item, idx) => (
          <div key={idx} className="mb-1.5 [break-inside:auto] page-break-inside-auto">
            <div className="flex justify-between font-bold items-start">
              <span>{item.quantity}x {item.name}</span>
              <span className="font-mono shrink-0">{formatPrice(item.finalUnitPrice * item.quantity)}</span>
            </div>
            {item.selectedModifiers && item.selectedModifiers.map((m, mIdx) => (
              <p key={mIdx} className="text-[10px] pl-3 text-gray-800">
                {m.optionName} {m.price > 0 ? `(+{formatPrice(m.price)})` : ''}
              </p>
            ))}
          </div>
        ))}
      </div>

      {/* 5. Financial Summary */}
      <div className="border-t border-dotted border-black pt-1 space-y-0.5 text-[11px] mb-2 [break-inside:avoid] page-break-inside-avoid">
        <div className="flex justify-between font-black text-xs border-b border-dotted border-black pb-1 mb-1">
          <span>GROSS AMOUNT</span>
          <span className="font-mono">{currency} {formatPrice(subtotal + deliveryCharges)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax 0%</span>
          <span className="font-mono">{formatPrice(taxAmount)}</span>
        </div>
        {isDelivery && (
          <div className="flex justify-between">
            <span>Delivery Charges</span>
            <span className="font-mono">{formatPrice(deliveryCharges)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Other Charges</span>
          <span className="font-mono">0</span>
        </div>
        <div className="flex justify-between">
          <span>Discount</span>
          <span className="font-mono">{formatPrice(discount)}</span>
        </div>
      </div>

      {/* 6. Total Amount & Amount in Words */}
      <div className="[break-inside:avoid] page-break-inside-avoid">
        <div className="border-t-2 border-b-2 border-black py-1.5 mb-1 flex justify-between items-center text-sm font-black">
          <span>TOTAL AMOUNT</span>
          <span className="font-mono text-base">{currency} {grandTotal.toLocaleString('en-PK', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="text-[10px] pb-2 border-b border-black mb-2 capitalize">
          {amountInWords}
        </div>
      </div>

      {/* 6b. Transaction Summary for CASH (Excluded for COD) */}
      {isCashPayment && !isCOD && (
        <div className="mb-2 pb-2 border-b border-black [break-inside:avoid] page-break-inside-avoid text-[11px]">
          <p className="font-black uppercase tracking-wider mb-1 text-black text-xs">TRANSACTION SUMMARY</p>
          <div className="flex justify-between">
            <span className="font-semibold">Cash Received:</span>
            <span className="font-mono font-bold">Rs. {formatPrice(cashReceivedVal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Change Returned:</span>
            <span className="font-mono font-bold">Rs. {formatPrice(changeReturnedVal)}</span>
          </div>
        </div>
      )}

      {/* 7. Special Instruction Note */}
      {order.customer_note && order.customer_note.trim() !== '' && (
        <div className="mb-2 [break-inside:avoid] page-break-inside-avoid">
          <div className="bg-black text-white font-black uppercase text-[10px] px-2 py-0.5 mb-1 tracking-wider inline-block">
            SPECIAL INSTRUCTION NOTE:
          </div>
          <p className="text-[10px] text-gray-900 leading-snug px-0.5 font-medium">{order.customer_note}</p>
        </div>
      )}

      {/* 8. Feedback QR Code */}
      <div className="text-center my-3 border-t border-black pt-2 [break-inside:avoid] page-break-inside-avoid">
        <div className="w-24 h-24 mx-auto border border-black p-1 bg-white flex items-center justify-center">
          <img src={`/tenants/${slug}/qr.png`} alt="Feedback QR" className="w-full h-full object-contain" />
        </div>
        <p className="text-[10px] mt-1 font-bold text-black">You can share your feedback</p>
      </div>

      {/* 9. Closing Footer */}
      <div className="text-center text-[10px] font-bold space-y-0.5 pt-2 border-t border-dotted border-black leading-relaxed [break-inside:avoid] page-break-inside-avoid">
        <p>Thank you for choosing {business.name}!</p>
        <p>See you again soon!</p>
      </div>

    </div>
  )
}