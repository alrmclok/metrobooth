// Test fixtures only (no app code imports this).
import type { Item, Sale, SaleLine } from '../core/types'
import type { StockChange } from '../core/checkout'
import type { SaveSaleInput } from './sales'

export const NOW = 1_700_000_000_000

export const makeItem = (over: Partial<Item> = {}): Item => ({
  id: 'item-1', createdAt: NOW, updatedAt: NOW,
  eventId: 'ev-1', name: 'Sticker', price: 10000,
  stock: 5, startingStock: 5, poStock: 2, startingPoStock: 2, poPrice: 0,
  sortOrder: 0, hasVariants: false,
  ...over,
})

export interface Part { itemId: string; qty: number; kind?: 'regular' | 'preorder'; price?: number }

export function makeSaleInput(saleId: string, parts: Part[]): SaveSaleInput {
  const lines: SaleLine[] = parts.map((p, i) => ({
    id: `${saleId}-line-${i}`, createdAt: NOW, updatedAt: NOW, saleId,
    itemId: p.itemId, nameSnapshot: 'Sticker', priceSnapshot: p.price ?? 10000,
    typeNameSnapshot: 'Unassigned', creatorNameSnapshot: 'Unassigned',
    kind: p.kind ?? 'regular', quantity: p.qty,
  }))
  const subtotal = lines.reduce((s, l) => s + l.priceSnapshot * l.quantity, 0)
  const sale: Sale = {
    id: saleId, createdAt: NOW, updatedAt: NOW, eventId: 'ev-1',
    paymentMethod: 'qris', subtotal, discount: 0, roundingAdjustment: 0,
    total: subtotal, status: 'paid',
  }
  const stockChanges: StockChange[] = parts.map(p => ({
    itemId: p.itemId, pool: p.kind === 'preorder' ? 'po' : 'regular', delta: -p.qty,
  }))
  return { sale, lines, stockChanges }
}
