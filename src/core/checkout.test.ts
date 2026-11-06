import { describe, expect, test } from 'vitest'
import type { Cart } from './cart'
import { checkout, looksLikeCashTypo } from './checkout'
import type { CheckoutContext } from './checkout'
import type { Item } from './types'

const makeItem = (over: Partial<Item> = {}): Item => ({
  id: 'item-1', createdAt: 0, updatedAt: 0, eventId: 'ev-1',
  name: 'Keychain', price: 15000, stock: 5, startingStock: 5,
  poStock: 0, startingPoStock: 0, poPrice: 0,
  sortOrder: 0, hasVariants: false,
  ...over,
})

const ctxOf = (...items: Item[]): CheckoutContext => ({
  items: new Map(items.map(i => [i.id, i])),
  types: new Map(),
  creators: new Map(),
})

const cartOf = (...lines: Cart['lines']): Cart =>
  ({ saleId: 'sale-1', eventId: 'ev-1', lines })

let n = 0
const opts = { now: 1000, makeId: () => `id-${++n}` }

describe('checkout', () => {
  test('cash sale: totals, change, stock deduction, snapshots', () => {
    const item = makeItem()
    const r = checkout(
      cartOf({ itemId: 'item-1', kind: 'regular', quantity: 2 }),
      ctxOf(item), { method: 'cash', cashReceived: 50000 }, opts)
    if (!r.ok) throw new Error('should be ok')
    expect(r.sale).toMatchObject({
      id: 'sale-1', paymentMethod: 'cash', subtotal: 30000, total: 30000,
      cashReceived: 50000, change: 20000, status: 'paid',
    })
    expect(r.lines[0]).toMatchObject({ nameSnapshot: 'Keychain', priceSnapshot: 15000, quantity: 2 })
    expect(r.stockChanges).toEqual([{ itemId: 'item-1', pool: 'regular', delta: -2 }])
  })

  test('QRIS sale has no cash fields', () => {
    const r = checkout(
      cartOf({ itemId: 'item-1', kind: 'regular', quantity: 1 }),
      ctxOf(makeItem()), { method: 'qris' }, opts)
    if (!r.ok) throw new Error('should be ok')
    expect(r.sale.paymentMethod).toBe('qris')
    expect(r.sale.cashReceived).toBeUndefined()
  })

  test('cash below total is rejected and says how short', () => {
    const r = checkout(
      cartOf({ itemId: 'item-1', kind: 'regular', quantity: 1 }),
      ctxOf(makeItem()), { method: 'cash', cashReceived: 10000 }, opts)
    expect(r).toEqual({ ok: false, error: { reason: 'cash_too_low', short: 5000 } })
  })

  test('total above 0 needs a payment', () => {
    const r = checkout(
      cartOf({ itemId: 'item-1', kind: 'regular', quantity: 1 }),
      ctxOf(makeItem()), undefined, opts)
    expect(r).toEqual({ ok: false, error: { reason: 'payment_required' } })
  })

  test('PO-only cart becomes a pickup and deducts poStock', () => {
    const item = makeItem({ poStock: 2 })
    const r = checkout(
      cartOf({ itemId: 'item-1', kind: 'preorder', quantity: 1 }),
      ctxOf(item), undefined, opts)
    if (!r.ok) throw new Error('should be ok')
    expect(r.sale.paymentMethod).toBe('pickup')
    expect(r.stockChanges).toEqual([{ itemId: 'item-1', pool: 'po', delta: -1 }])
  })

  test('Rp 0 regular sale is "none", not "pickup"', () => {
    const r = checkout(
      cartOf({ itemId: 'item-1', kind: 'regular', quantity: 1 }),
      ctxOf(makeItem({ price: 0 })), undefined, opts)
    if (!r.ok) throw new Error('should be ok')
    expect(r.sale.paymentMethod).toBe('none')
  })

  test('mixed cart: PO price counts toward the total', () => {
    const item = makeItem({ poStock: 1, poPrice: 5000 })
    const r = checkout(
      cartOf(
        { itemId: 'item-1', kind: 'regular', quantity: 1 },
        { itemId: 'item-1', kind: 'preorder', quantity: 1 }),
      ctxOf(item), { method: 'qris' }, opts)
    if (!r.ok) throw new Error('should be ok')
    expect(r.sale.total).toBe(20000)
    expect(r.stockChanges).toHaveLength(2)
  })

  test('stock never goes negative (stock dropped after adding to cart)', () => {
    const r = checkout(
      cartOf({ itemId: 'item-1', kind: 'regular', quantity: 2 }),
      ctxOf(makeItem({ stock: 1 })), { method: 'qris' }, opts)
    expect(r).toEqual({ ok: false, error: { reason: 'not_enough_stock', itemId: 'item-1', left: 1 } })
  })

  test('empty cart is rejected', () => {
    expect(checkout(cartOf(), ctxOf(makeItem()), { method: 'qris' }, opts))
      .toEqual({ ok: false, error: { reason: 'empty_cart' } })
  })

  test('items without type/creator snapshot as "Unassigned"', () => {
    const r = checkout(
      cartOf({ itemId: 'item-1', kind: 'regular', quantity: 1 }),
      ctxOf(makeItem()), { method: 'qris' }, opts)
    if (!r.ok) throw new Error('should be ok')
    expect(r.lines[0]).toMatchObject({
      typeNameSnapshot: 'Unassigned', creatorNameSnapshot: 'Unassigned',
    })
  })

  test('checking out the same cart twice gives the same sale id', () => {
    const cart = cartOf({ itemId: 'item-1', kind: 'regular', quantity: 1 })
    const a = checkout(cart, ctxOf(makeItem()), { method: 'qris' }, opts)
    const b = checkout(cart, ctxOf(makeItem()), { method: 'qris' }, opts)
    if (!a.ok || !b.ok) throw new Error('should be ok')
    expect(a.sale.id).toBe(b.sale.id)
  })

  test('cash typo check flags more than 10x the total', () => {
    expect(looksLikeCashTypo(15000, 200000)).toBe(true)
    expect(looksLikeCashTypo(15000, 50000)).toBe(false)
    expect(looksLikeCashTypo(0, 50000)).toBe(false)
  })

    test('cash is rounded and the adjustment is stored', () => {
    const ctx = { ...ctxOf(makeItem({ price: 12300 })), rounding: { step: 500, mode: 'nearest' } as const }
    const r = checkout(
      cartOf({ itemId: 'item-1', kind: 'regular', quantity: 1 }),
      ctx, { method: 'cash', cashReceived: 20000 }, opts)
    if (!r.ok) throw new Error('should be ok')
    expect(r.sale).toMatchObject({
      subtotal: 12300, roundingAdjustment: 200, total: 12500, change: 7500,
    })
  })

  test('rounding down stores a negative adjustment', () => {
    const ctx = { ...ctxOf(makeItem({ price: 12200 })), rounding: { step: 500, mode: 'nearest' } as const }
    const r = checkout(
      cartOf({ itemId: 'item-1', kind: 'regular', quantity: 1 }),
      ctx, { method: 'cash', cashReceived: 12000 }, opts)
    if (!r.ok) throw new Error('should be ok')
    expect(r.sale).toMatchObject({ roundingAdjustment: -200, total: 12000, change: 0 })
  })

  test('QRIS is never rounded', () => {
    const ctx = { ...ctxOf(makeItem({ price: 12300 })), rounding: { step: 500, mode: 'nearest' } as const }
    const r = checkout(
      cartOf({ itemId: 'item-1', kind: 'regular', quantity: 1 }),
      ctx, { method: 'qris' }, opts)
    if (!r.ok) throw new Error('should be ok')
    expect(r.sale).toMatchObject({ total: 12300, roundingAdjustment: 0 })
  })

  test('cash check uses the rounded total', () => {
    const ctx = { ...ctxOf(makeItem({ price: 12300 })), rounding: { step: 500, mode: 'nearest' } as const }
    const r = checkout(
      cartOf({ itemId: 'item-1', kind: 'regular', quantity: 1 }),
      ctx, { method: 'cash', cashReceived: 12400 }, opts)
    expect(r).toEqual({ ok: false, error: { reason: 'cash_too_low', short: 100 } })
  })
})