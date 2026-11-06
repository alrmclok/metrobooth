// src/core/types.ts
// Based on spec section 9. Plain TypeScript only: no React, no DOM, no Dexie.

export type ID = string        // UUID
export type Timestamp = number // ms since epoch, UTC (spec 17.4: store UTC, show local)
export type Rupiah = number    // whole integers only (spec 17.3)

interface Base {
  id: ID
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ---------- Events & grouping ----------
export type EventStatus = 'active' | 'ended'
export type GroupBy = 'type' | 'creator'

export interface BoothEvent extends Base {
  name: string
  status: EventStatus
  startedAt: Timestamp
  endedAt?: Timestamp
  venue?: string
  copiedFromEventId?: ID
  reopenedAt?: Timestamp
  isDemo?: boolean
  sidebarGroupBy: GroupBy // default 'type'
}

export interface ItemType extends Base {
  eventId: ID
  name: string
  sortOrder: number
}

export interface Creator extends Base {
  eventId: ID
  name: string
  color?: string
  sortOrder: number
}

export interface StoredImage extends Base {
  blob: Blob
  width: number
  height: number
}

// ---------- Items ----------
export interface Item extends Base {
  eventId: ID
  name: string
  price: Rupiah
  costPrice?: Rupiah
  imageId?: ID
  typeId?: ID
  creatorId?: ID // one creator only
  stock: number
  startingStock: number
  poStock: number
  startingPoStock: number
  poPrice: Rupiah // default 0
  sortOrder: number
  hasVariants: boolean
  deletedAt?: Timestamp // soft delete
  isDemo?: boolean
}

export interface Variant extends Base {
  itemId: ID
  name: string
  stock: number
  startingStock: number
  poStock: number
  startingPoStock: number
  imageId?: ID
  sortOrder: number
  deletedAt?: Timestamp
}

export interface Bundle extends Base {
  eventId: ID
  itemId: ID
  quantity: number
  bundlePrice: Rupiah
}

// ---------- Sales ----------
export type PaymentMethod = 'cash' | 'qris' | 'none' | 'pickup'
export type SaleStatus = 'paid' | 'voided'
export type LineKind = 'regular' | 'preorder'

export interface Sale extends Base {
  eventId: ID
  paymentMethod: PaymentMethod
  subtotal: Rupiah
  discount: Rupiah
  roundingAdjustment: Rupiah // can be negative
  total: Rupiah
  cashReceived?: Rupiah
  change?: Rupiah
  note?: string
  status: SaleStatus
  voidedAt?: Timestamp
}

export interface SaleLine extends Base {
  saleId: ID
  itemId: ID
  variantId?: ID
  nameSnapshot: string
  variantNameSnapshot?: string
  priceSnapshot: Rupiah
  typeNameSnapshot: string
  creatorNameSnapshot: string
  kind: LineKind
  quantity: number
}

// ---------- Stock history ----------
export type StockPool = 'regular' | 'po'
export type AdjustmentReason =
  | 'restock' | 'gift' | 'damaged'
  | 'count_correction' | 'override' | 'void' | 'other'

export interface StockAdjustment extends Base {
  eventId: ID
  itemId: ID
  variantId?: ID
  pool: StockPool
  delta: number // negative = stock removed
  reason: AdjustmentReason
  saleId?: ID // for 'override' and 'void'
}

export interface ClosingCount extends Base {
  eventId: ID
  itemId: ID
  variantId?: ID
  expectedStock: number
  expectedPo: number
  actualStock?: number
  actualPo?: number
  checked: boolean
  countedAt?: Timestamp
}

export interface LogEntry extends Base {
  eventId?: ID
  kind: string
  detail?: string
}

// ---------- Settings (one record) ----------
export type RoundingStep = 0 | 100 | 500 | 1000
export type RoundingMode = 'nearest' | 'up'

export interface Settings extends Base {
  theme: string // 'flat-white' | 'flat-black' | 'transit' | 'metro' | 'custom:<id>'
  boothName: string
  successText: string
  qrisImageId?: ID
  roundingStep: RoundingStep
  roundingMode: RoundingMode
  denominations: number[]
  developerOptionsEnabled: boolean
  lowStockThreshold: number // default 3
  currency: string
  language: 'id' | 'en'
  editPinHash?: string
  editPinSalt?: string
  soundEnabled: boolean
  keepAwake: boolean
  largeText: boolean
  highContrast: boolean
  reduceDecoration: boolean
}