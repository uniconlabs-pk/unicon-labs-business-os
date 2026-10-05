interface ThermalKOTProps {
  kotData: {
    kotNo: string
    orderNumber: string
    time: string
    staff: string
    waiter: string
    deliveryNote?: string
    serviceType: string
    tableName?: string
    items: any[]
  }
  business?: {
    name?: string
  }
  slug?: string
}

export default function ThermalKOT({ kotData, business, slug }: ThermalKOTProps) {
  if (!kotData) return null

  return (
    <div className="bg-white text-black font-sans text-xs p-2 leading-tight select-none w-[80mm]">
      <div className="text-center mb-2">
        <img 
          src={`/tenants/${slug || 'default'}/logo-thermal.png`} 
          alt="Thermal Logo" 
          className="w-24 h-24 mx-auto object-contain mb-1 grayscale contrast-200" 
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <h1 className="font-black text-xl tracking-wider uppercase text-black">{business?.name || 'KRUNCHY BITE'}</h1>
        <div className="bg-black text-white text-[9px] font-black uppercase px-3 py-0.5 rounded tracking-widest inline-block my-1">
          TASTY - JUICY - SPICY
        </div>
          
        <div className="font-black text-lg tracking-widest uppercase mt-2">- KOT -</div>
        <div className="font-bold text-xs tracking-wide">( KITCHEN ORDER TICKET )</div>
      </div>

      <div className="border-t-2 border-b-2 border-black py-2 space-y-1 mb-2 text-xs font-semibold">
        <div className="flex justify-between">
          <span>Date/Time:</span>
          <span className="font-mono">{kotData.time}</span>
        </div>
        <div className="flex justify-between">
          <span>Order Number:</span>
          <span className="font-mono font-bold">{kotData.orderNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>KOT Number:</span>
          <span className="font-mono font-bold">{kotData.kotNo}</span>
        </div>
        <div className="flex justify-between">
          <span>Order Type:</span>
          <span className="font-bold uppercase">{kotData.serviceType}</span>
        </div>
        {kotData.tableName && (
          <div className="flex justify-between">
            <span>Table Number:</span>
            <span className="font-mono font-bold">{kotData.tableName}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Merchant Name:</span>
          <span>{kotData.staff}</span>
        </div>
        <div className="flex justify-between">
          <span>Waiter Name:</span>
          <span className="font-bold">{kotData.waiter}</span>
        </div>
        {kotData.deliveryNote && (
          <div className="pt-1 border-t border-dashed border-black mt-1">
            <span className="font-bold uppercase">Instruction:</span> {kotData.deliveryNote}
          </div>
        )}
      </div>

      <div className="mb-3 text-xs">
        <div className="font-black uppercase tracking-wider text-sm mb-1 border-b border-black pb-0.5">ORDER DETAIL</div>
        <div className="font-black uppercase text-xs mb-1.5">ITEM DESCRIPTION</div>
        <div className="border-b border-dotted border-black mb-2"></div>

        <div className="space-y-2.5">
          {kotData.items.map((i: any, k: number) => (
            <div key={k} className="space-y-0.5">
              <div className="font-black text-sm text-black">
                {i.qty}x {i.name} {i.selectedVariant ? `[${i.selectedVariant.name}]` : ''}
              </div>
              {i.dealComponents && i.dealComponents.length > 0 && (
                <div className="pl-4 text-xs text-gray-900 space-y-0.5 font-medium">
                  {i.dealComponents.map((dc: any, dcK: number) => (
                    <div key={dcK}>&nbsp;&nbsp;&nbsp;&nbsp;{dc.qty} {dc.name}</div>
                  ))}
                </div>
              )}
              {i.selectedAddons && i.selectedAddons.length > 0 && (
                <div className="pl-4 text-[11px] text-gray-800">
                  {i.selectedAddons.map((ao: any, aoK: number) => (
                    <div key={aoK}>&nbsp;&nbsp;&nbsp;&nbsp;+ {ao.name}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="text-center font-black text-xs pt-2 border-t-2 border-black tracking-widest uppercase mt-4">
        --- END OF KOT ---
      </div>
    </div>
  )
}