// ============================================
// POS Types — BelloSuite ERP
// ============================================

export type PaymentMethod = 'CASH' | 'CARD' | 'CHECK' | 'BANK_TRANSFER' | 'MIXED'
export type POSOrderStatus = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'CANCELLED'
export type POSSessionStatus = 'OPEN' | 'CLOSED'

export interface POSCartItem {
  productId: string | null
  productCode: string | null
  description: string
  quantity: number
  unitPriceHT: number
  vatRate: number
  vatAmount: number
  discount: number
  totalHT: number
  totalTTC: number
}

export interface POSOrderPayload {
  tenantId: string
  sessionId: string
  userId: string
  userName: string
  clientId?: string
  clientName?: string
  items: POSCartItem[]
  paymentMethod: PaymentMethod
  paidAmount: number
  discountPercent: number
  notes?: string
}

export interface POSSessionInfo {
  id: string
  tenantId: string
  userId: string
  userName: string
  openingCash: number
  closingCash?: number
  status: POSSessionStatus
  openedAt: string
  closedAt?: string
  ordersCount?: number
  totalSales?: number
}

export interface POSProduct {
  id: string
  code: string
  barcode?: string
  name: string
  category?: string
  unit: string
  salePrice: number
  vatRate: number
  currentStock: number
}



export interface POSStats {
  ordersToday: number
  salesToday: number
  avgTicket: number
  topProducts: { name: string; qty: number }[]
}

export const TIMBRE_FISCAL = 1.000
export const DEFAULT_VAT_RATE = 19
export const FODEC_RATE = 1
