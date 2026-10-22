'use client'
import React from 'react'

interface CateringQuotationProps {
  business: {
    name: string
    address?: string
    phone?: string
    email?: string
    web_url?: string
    logo_url?: string
    currency_symbol?: string
    slug?: string
  }
  quotation: {
    quotation_no: string
    created_at?: string
    event_date: string
    event_time?: string
    event_type?: string
    client_name: string
    client_phone: string
    client_email?: string
    venue_name?: string
    venue_address: string
    guest_count: number
    items_json: {
      category: string
      name: string
      paxQty: number | string
      unitPrice: number | string
    }[]
    service_charges?: number | string
    transport_charges?: number | string
    tax_amount?: number | string
    tax_percent?: number | string
    discount_amount?: number | string
    total_amount: number | string
    terms_notes?: string
  }
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

  return result.charAt(0).toUpperCase() + result.slice(1)
}

export default function CateringQuotation({ business, quotation }: CateringQuotationProps) {
  const currency = business.currency_symbol || 'Rs.'
  
  // Format Date & Time
  const createdDateObj = quotation.created_at ? new Date(quotation.created_at) : new Date()
  const formattedDated = createdDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' / ' + createdDateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

  const items = quotation.items_json || []
  const menuSubtotal = items.reduce((sum, item) => sum + ((parseFloat(String(item.paxQty)) || 0) * (parseFloat(String(item.unitPrice)) || 0)), 0)
  
  const serviceCharges = parseFloat(String(quotation.service_charges || 0))
  const transportCharges = parseFloat(String(quotation.transport_charges || 0))
  const taxPercent = parseFloat(String(quotation.tax_percent || 0))
  const taxAmount = parseFloat(String(quotation.tax_amount || 0))
  const discountAmount = parseFloat(String(quotation.discount_amount || 0))
  
  const grandTotal = parseFloat(String(quotation.total_amount)) || (menuSubtotal + serviceCharges + transportCharges + taxAmount - discountAmount)

  const amountInWords = `Rupees ${numberToWords(grandTotal)} Only.`
  const formatPrice = (val: number) => val.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="w-[210mm] min-h-[297mm] bg-white text-black p-10 shadow-2xl mx-auto flex flex-col justify-between font-sans text-xs select-none print:shadow-none print:w-[210mm] print:max-w-none print:p-4 print:m-0 print:box-border" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
      
      {/* TOP HEADER SECTION */}
      <div className="space-y-2">
        <div className="flex justify-between items-start pb-2">
          <div className="space-y-1.5 w-[65%] pr-4">
            {business.logo_url ? (
              <img src={business.logo_url} alt={business.name} className="h-28 w-auto object-contain mb-1" />
            ) : (
              <div className="text-xl font-black uppercase">{business.name}</div>
            )}
            {business.address && <p className="text-[11px] text-slate-800 leading-snug">{business.address}</p>}
            <p className="text-[11px] text-slate-800 whitespace-nowrap">
              {business.phone ? `Phone: ${business.phone}` : ''}{business.email ? ` | E-Mail: ${business.email}` : ''}{business.web_url ? ` | Website URL: ${business.web_url}` : ''}
            </p>
          </div>

          <div className="text-right space-y-1 w-[35%] shrink-0">
            <h1 className="text-3xl font-black tracking-wider uppercase text-black">QUOTATION</h1>
            <p className="text-[11px] font-medium text-slate-800">Dated: <span className="font-mono">{formattedDated}</span></p>
            <p className="text-[11px] font-medium text-slate-800">Quotation No. : <span className="font-mono font-bold text-emerald-700">{quotation.quotation_no}</span></p>
          </div>
        </div>

        {/* CUSTOMER & EVENT DETAIL SIDE-BY-SIDE BANNERS */}
        <div className="grid grid-cols-2 border border-black text-[11px]">
          {/* Customer Detail Header */}
          <div className="bg-[#4a4a4a] text-white font-black uppercase px-3 py-1.5 tracking-wider border-r border-black">
            CUSTOMER DETAIL:
          </div>
          {/* Event Detail Header */}
          <div className="bg-[#4a4a4a] text-white font-black uppercase px-3 py-1.5 tracking-wider">
            EVENT DETAIL:
          </div>

          {/* Customer Detail Content */}
          <div className="p-3 space-y-1.5 border-r border-black bg-white">
            <div className="flex">
              <span className="w-28 text-slate-600 font-medium">Customer Name</span>
              <span className="w-3 text-center">:</span>
              <span className="flex-1 font-black text-black">{quotation.client_name}</span>
            </div>
            <div className="flex">
              <span className="w-28 text-slate-600 font-medium">Contact No.</span>
              <span className="w-3 text-center">:</span>
              <span className="flex-1 font-mono font-bold text-blue-700">{quotation.client_phone}</span>
            </div>
            <div className="flex">
              <span className="w-28 text-slate-600 font-medium">Address</span>
              <span className="w-3 text-center">:</span>
              <span className="flex-1 text-slate-800 leading-snug">Karachi-75290.</span>
            </div>
            <div className="flex">
              <span className="w-28 text-slate-600 font-medium">E-Mail Address</span>
              <span className="w-3 text-center">:</span>
              <span className="flex-1 font-mono text-slate-800">{quotation.client_email || 'N/A'}</span>
            </div>
          </div>

          {/* Event Detail Content */}
          <div className="p-3 space-y-1.5 bg-white">
            <div className="flex">
              <span className="w-28 text-slate-600 font-medium">Event</span>
              <span className="w-3 text-center">:</span>
              <span className="flex-1 font-bold text-black">{quotation.event_type || 'N/A'}</span>
            </div>
            <div className="flex">
              <span className="w-28 text-slate-600 font-medium">Event Date/Time</span>
              <span className="w-3 text-center">:</span>
              <span className="flex-1 font-mono font-bold text-slate-900">{quotation.event_date} {quotation.event_time ? `/ ${quotation.event_time}` : ''}</span>
            </div>
            <div className="flex items-center">
              <span className="w-28 text-slate-600 font-medium">PAX/Guest Count</span>
              <span className="w-3 text-center">:</span>
              <span className="flex-1 font-mono font-black text-black flex items-center space-x-1.5">
                <span>x {quotation.guest_count}</span>
                <span>👥</span>
              </span>
            </div>
            <div className="flex">
              <span className="w-28 text-slate-600 font-medium">Venue Name</span>
              <span className="w-3 text-center">:</span>
              <span className="flex-1 font-bold text-black">{quotation.venue_name || 'N/A'}</span>
            </div>
            <div className="flex">
              <span className="w-28 text-slate-600 font-medium">Venue Address</span>
              <span className="w-3 text-center">:</span>
              <span className="flex-1 text-slate-800">{quotation.venue_address}</span>
            </div>
          </div>
        </div>

        {/* MENU BREAKDOWN TABLE */}
        <div className="border border-black mt-2">
          <div className="bg-[#4a4a4a] text-white font-black uppercase px-3 py-1.5 tracking-wider text-center text-xs">
            MENU BREAKDOWN & PACKAGE ITEMS
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-200 text-slate-900 uppercase text-[10px] font-black border-b border-black">
                <th className="p-2.5 w-12 text-center border-r border-black">S/No.</th>
                <th className="p-2.5 border-r border-black">Item Description</th>
                <th className="p-2.5 border-r border-black">Category</th>
                <th className="p-2.5 w-20 text-center border-r border-black">PAX/Qty.</th>
                <th className="p-2.5 w-28 text-right border-r border-black">Unite Price</th>
                <th className="p-2.5 w-28 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 font-medium">
              {items.map((it, idx) => {
                const lineAmount = (parseFloat(String(it.paxQty)) || 0) * (parseFloat(String(it.unitPrice)) || 0)
                return (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2.5 text-center font-mono border-r border-slate-300">{idx + 1}.</td>
                    <td className="p-2.5 font-bold text-black border-r border-slate-300">{it.name}</td>
                    <td className="p-2.5 text-slate-700 border-r border-slate-300">{it.category}</td>
                    <td className="p-2.5 text-center font-mono border-r border-slate-300">{it.paxQty}</td>
                    <td className="p-2.5 text-right font-mono border-r border-slate-300">{formatPrice(Number(it.unitPrice))}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-black">{formatPrice(lineAmount)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* FINANCIAL SUMMARY */}
        <div className="border-x border-b border-black text-xs font-mono">
          <div className="flex justify-between items-center bg-slate-200 px-3 py-2 font-black border-b border-black text-black">
            <span className="uppercase font-sans">Menu Subtotal</span>
            <span>Rs. {formatPrice(menuSubtotal)}</span>
          </div>
          
          <div className="p-2 space-y-1.5 bg-white border-b border-black">
            {serviceCharges > 0 && (
              <div className="flex justify-between px-2">
                <span className="font-sans text-slate-700 font-semibold">Service & Setup Charges</span>
                <span>{formatPrice(serviceCharges)}</span>
              </div>
            )}
            {transportCharges > 0 && (
              <div className="flex justify-between px-2">
                <span className="font-sans text-slate-700 font-semibold">Transport Charges</span>
                <span>{formatPrice(transportCharges)}</span>
              </div>
            )}
            {taxAmount > 0 && (
              <div className="flex justify-between px-2">
                <span className="font-sans text-slate-700 font-semibold">Tax / GST ({taxPercent}%)</span>
                <span>{formatPrice(taxAmount)}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center bg-black text-white px-3 py-2.5 font-black text-sm">
            <span className="uppercase font-sans tracking-wide">GRAND TOTAL</span>
            <span>Rs. {formatPrice(grandTotal)}</span>
          </div>
        </div>

        {/* AMOUNT IN WORDS */}
        <div className="border-x border-b border-black bg-slate-100 px-3 py-2 text-xs font-bold text-black flex items-center space-x-2 mt-0">
          <span className="uppercase tracking-wider">AMOUNT IN WORDS:</span>
          <span className="font-serif italic text-slate-900">{amountInWords}</span>
        </div>

        {/* TERMS & CONDITIONS */}
        <div className="space-y-1.5 pt-1">
          <h4 className="font-black uppercase text-xs text-red-600 tracking-wider">TERMS & CONDITIONS</h4>
          <div className="text-[11px] text-slate-800 space-y-1 leading-relaxed whitespace-pre-line font-medium">
            {quotation.terms_notes || '1. 50% advance payment required upon order confirmation.\n2. Balance payment due on or before event day.\n3. All prices are only valid for 7 days from the date of quotation issued.'}
          </div>
        </div>

      </div>

      {/* FOOTER SIGNATURE BOXES */}
      <div className="pt-4 space-y-4">
        <div className="grid grid-cols-2 border border-black text-center text-xs">
          <div className="bg-[#4a4a4a] text-white font-black uppercase py-1.5 tracking-wider border-r border-black">
            CUSTOMER SIGNATURE / DETAILS
          </div>
          <div className="bg-[#4a4a4a] text-white font-black uppercase py-1.5 tracking-wider">
            {business.name.toUpperCase()}
          </div>
          <div className="h-24 border-r border-black bg-white"></div>
          <div className="h-24 bg-white"></div>
        </div>
      </div>

    </div>
  )
}