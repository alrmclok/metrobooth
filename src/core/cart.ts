import { newId } from './ids'
import type { ID, Item, LineKind, Rupiah } from './types'

// A cart line only stores WHAT and HOW MANY. Prices are read from the item
// at calculation time, so editing a price live reprices the cart (spec 17.2).
// The price snapshot is taken later, at Paid.
export interface CartLine {
  itemId: ID
  kind: LineKind // 'regular' | 'preorder'
  quantity: number
}

export interface Cart {
  saleId: ID // created once, when the cart starts
  eventId: ID
  lines: CartLine[]
}

export type AddResult =
  | { ok: true; cart: Cart }
  | { ok: false; reason: 'unavailable' } // item soft-deleted
  | { ok: false; reason: 'not_enough_stock'; left: number }

export function createCart(eventId: ID, saleId: ID = newId()): Cart {
  return { saleId, eventId, lines: [] }
}

export const stockFor = (item: Item, kind: LineKind): number =>
  kind === 'regular' ? item.stock : item.poStock

export const unitPrice = (item: Item, kind: LineKind): Rupiah =>
  kind === 'regular' ? item.price : item.poPrice

export function quantityInCart(cart: Cart, itemId: ID, kind: LineKind): number {
  return cart.lines.find(l => l.itemId === itemId && l.kind === kind)?.quantity ?? 0
}

// Blocked at TAP time, not at Paid, and says how many are left (spec 17.2).
export function addToCart(cart: Cart, item: Item, kind: LineKind): AddResult {
  if (item.deletedAt !== undefined) return { ok: false, reason: 'unavailable' }

  const inCart = quantityInCart(cart, item.id, kind)
  const left = stockFor(item, kind) - inCart
  if (left <= 0) return { ok: false, reason: 'not_enough_stock', left: 0 }

  const exists = inCart > 0
  const lines = exists
    ? cart.lines.map(l =>
        l.itemId === item.id && l.kind === kind ? { ...l, quantity: l.quantity + 1 } : l)
    : [...cart.lines, { itemId: item.id, kind, quantity: 1 }]

  return { ok: true, cart: { ...cart, lines } }
}

export function removeOneFromCart(cart: Cart, itemId: ID, kind: LineKind): Cart {
  const lines = cart.lines
    .map(l => (l.itemId === itemId && l.kind === kind ? { ...l, quantity: l.quantity - 1 } : l))
    .filter(l => l.quantity > 0)
  return { ...cart, lines }
}

export function cartSubtotal(cart: Cart, items: ReadonlyMap<ID, Item>): Rupiah {
  return cart.lines.reduce((sum, line) => {
    const item = items.get(line.itemId)
    if (!item) throw new Error(`Item ${line.itemId} not found`)
    return sum + unitPrice(item, line.kind) * line.quantity
  }, 0)
}

// A cart made only of PO lines shows "Confirm pickup" (spec 5.2).
export const isPickupOnly = (cart: Cart): boolean =>
  cart.lines.length > 0 && cart.lines.every(l => l.kind === 'preorder')