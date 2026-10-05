interface ThermalSaleReturnProps {
  srrData: {
    storeName: string
    address: string
    phone: string
    srrNo: string
    originalOrderNo: string
    serialNumber: string
    date: string
    serviceType: string
    paymentMode: string
    authorizedManager: string
    refundReason: string
    returnedItems: any[]
    totalRefundAmount: number
  }
  currencySymbol?: string
}

export default function ThermalSaleReturn({ srrData, currencySymbol = 'Rs.' }: ThermalSaleReturnProps) {
  if (!srrData) return null

  return (
    <div className="bg-white text-black font-sans text-xs p-3 leading-tight select-none w-[80mm]">
      <div className="text-center mb-3">
        <h1 className="font-black text-xl tracking-wider uppercase">{srrData.storeName}</h1>
        <p className="text-[10px]">{srrData.address}</p>
        <p className="text-[10px] font-mono">Phone: {srrData.phone}</p>
        <div className="bg-black text-white text-[10px] font-black uppercase px-3 py-1 rounded tracking-widest inline-block my-2">
          SALES RETURN RECEIPT (SRR)
        </div>
      </div>

      <div className="border-t border-b border-black py-2 space-y-1 mb-3 text-[11px] font-semibold font-mono">
        <div className="flex justify-between">
          <span>SRR No:</span>
          <span className="font-bold">{srrData.srrNo}</span>
        </div>
        <div className="flex justify-between">
          <span>Original Order:</span>
          <span>{srrData.originalOrderNo}</span>
        </div>
        <div className="flex justify-between">
          <span>Serial Number:</span>
          <span>{srrData.serialNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Date & Time:</span>
          <span>{srrData.date}</span>
        </div>
        <div className="flex justify-between">
          <span>Order Type:</span>
          <span className="uppercase">{srrData.serviceType}</span>
        </div>
        <div className="flex justify-between">
          <span>Payment Mode:</span>
          <span className="uppercase">{srrData.paymentMode}</span>
        </div>
        <div className="flex justify-between">
          <span>Authorized By:</span>
          <span className="font-bold">{srrData.authorizedManager}</span>
        </div>
        <div className="pt-1 border-t border-dashed border-black">
          <span className="font-bold uppercase">Return Reason:</span> {srrData.refundReason}
        </div>
      </div>

      <div className="mb-3">
        <div className="font-black uppercase text-[11px] mb-1 border-b border-black pb-0.5">RETURNED ITEMS BREAKDOWN</div>
        <div className="space-y-2 pt-1">
          {srrData.returnedItems.map((ri: any, riIdx: number) => (
            <div key={riIdx} className="flex justify-between items-start text-xs border-b border-dotted border-gray-300 pb-1">
              <div>
                <span className="font-bold">{ri.qty}x {ri.name} {ri.selectedVariant ? `[${ri.selectedVariant.name}]` : ''}</span>
                <div className="text-[10px] font-mono text-gray-600">Unit: {currencySymbol} {ri.finalUnitPrice || ri.price}</div>
              </div>
              <div className="font-mono font-bold">
                {currencySymbol} {(ri.finalUnitPrice || ri.price || 0) * ri.qty}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t-2 border-black pt-2 mb-4 space-y-1 font-mono">
        <div className="flex justify-between text-sm font-black text-black">
          <span>TOTAL REFUND DISBURSED:</span>
          <span>{currencySymbol} {srrData.totalRefundAmount}</span>
        </div>
      </div>

      <div className="text-center font-bold text-[10px] pt-3 border-t border-dashed border-black uppercase tracking-wider">
        --- OFFICIAL RETURN & REFUND RECORD ---
      </div>
    </div>
  )
}