export interface BusinessProfile {
  typeKey: string
  displayName: string
  badgeColor: string
  modules: {
    hasKDS: boolean
    hasTables: boolean
    hasInventoryVariants: boolean
    hasBatchExpiry: boolean
    hasDispatchQueue: boolean
    hasStorefront: boolean
  }
  terminology: {
    productsLabel: string
    ordersLabel: string
    posTitle: string
  }
}

const BUSINESS_PROFILES: Record<string, BusinessProfile> = {
  restaurant: {
    typeKey: 'restaurant',
    displayName: 'Restaurant & Food Service',
    badgeColor: 'bg-emerald-100 text-emerald-800',
    modules: {
      hasKDS: true,
      hasTables: true,
      hasInventoryVariants: false,
      hasBatchExpiry: false,
      hasDispatchQueue: false,
      hasStorefront: true,
    },
    terminology: {
      productsLabel: 'Menu Items',
      ordersLabel: 'Kitchen Tickets & Orders',
      posTitle: 'Dine-In & Counter POS',
    },
  },
  retail: {
    typeKey: 'retail',
    displayName: 'Retail Store & Boutique',
    badgeColor: 'bg-purple-100 text-purple-800',
    modules: {
      hasKDS: false,
      hasTables: false,
      hasInventoryVariants: true,
      hasBatchExpiry: false,
      hasDispatchQueue: false,
      hasStorefront: true,
    },
    terminology: {
      productsLabel: 'Store Inventory',
      ordersLabel: 'Sales History',
      posTitle: 'Barcode Retail POS',
    },
  },
  perfumery: {
    typeKey: 'perfumery',
    displayName: 'Perfumery & Fragrance',
    badgeColor: 'bg-amber-100 text-amber-800',
    modules: {
      hasKDS: false,
      hasTables: false,
      hasInventoryVariants: true, // e.g., 50ml vs 100ml impressions
      hasBatchExpiry: false,
      hasDispatchQueue: false,
      hasStorefront: true,
    },
    terminology: {
      productsLabel: 'Fragrance Catalog',
      ordersLabel: 'Customer Orders',
      posTitle: 'Perfumery POS Register',
    },
  },
  'building materials': {
    typeKey: 'building materials',
    displayName: 'Building Materials & Hardware',
    badgeColor: 'bg-blue-100 text-blue-800',
    modules: {
      hasKDS: false,
      hasTables: false,
      hasInventoryVariants: true,
      hasBatchExpiry: false,
      hasDispatchQueue: true, // Warehouse dispatch & delivery notes
      hasStorefront: true,
    },
    terminology: {
      productsLabel: 'Materials & Stock',
      ordersLabel: 'Dispatch Queue & Orders',
      posTitle: 'Wholesale & Counter POS',
    },
  },
  pharmacy: {
    typeKey: 'pharmacy',
    displayName: 'Pharmacy & Medical Store',
    badgeColor: 'bg-teal-100 text-teal-800',
    modules: {
      hasKDS: false,
      hasTables: false,
      hasInventoryVariants: false,
      hasBatchExpiry: true, // Batch & expiry tracking
      hasDispatchQueue: true, // Prescription fulfillment queue
      hasStorefront: true,
    },
    terminology: {
      productsLabel: 'Medicine Inventory',
      ordersLabel: 'Prescription & Online Queue',
      posTitle: 'Pharmacy Dispensing POS',
    },
  },
}

export function getBusinessProfile(businessType: string): BusinessProfile {
  const normalized = (businessType || '').toLowerCase().trim()
  
  // Match or fallback to retail/universal standard if unknown
  return BUSINESS_PROFILES[normalized] || {
    typeKey: normalized,
    displayName: businessType || 'General Business',
    badgeColor: 'bg-gray-100 text-gray-800',
    modules: {
      hasKDS: false,
      hasTables: false,
      hasInventoryVariants: true,
      hasBatchExpiry: false,
      hasDispatchQueue: false,
      hasStorefront: true,
    },
    terminology: {
      productsLabel: 'Catalog Items',
      ordersLabel: 'Order Logs',
      posTitle: 'Standard POS Register',
    },
  }
}