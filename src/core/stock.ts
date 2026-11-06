import type { Item, StockPool } from './types'

// Applies a stock change to an item and returns a NEW item.
// Stock can never go below 0 (spec 14).
export function applyStockDelta(item: Item, pool: StockPool, delta: number): Item {
  if (pool === 'regular') {
    const next = item.stock + delta
    if (next < 0) throw new Error(`Stock for ${item.id} would go below 0`)
    return { ...item, stock: next }
  }
  const next = item.poStock + delta
  if (next < 0) throw new Error(`PO stock for ${item.id} would go below 0`)
  return { ...item, poStock: next }
}