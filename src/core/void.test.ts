import { describe, expect, test } from 'vitest'
import { checkout } from './checkout'
import { applyStockDelta } from './stock'
import type { Item, Sale, SaleLine } from './types'
import { countsInReports, voidSale } from './void'

const makeItem = (over: Partial<Item> = {}): Item => ({
  id: 'item-1', createdAt: 0, updatedAt: 0, eventId: 'ev-1',
  name: 'Keychain', price: 15000, stock: 5, startingStock: 5,
  poStock: 2, startingPoStock: 2, poPrice: 0,
  sortOrder: 0, hasVariants: false,
  ...over,
})

const makeSale = (over: Partial<Sale> = {}): Sale => ({
  id: 'sale-1', createdAt: 0, updatedAt: 0, eventId: 'ev-1',
  paymentMethod: 'cash', subtotal: 30000, discount: 1000,
  roundingAdjustment: 200, total: 29200, status: 'paid',
  ...over,
})

const makeLine = (over: Partial<SaleLine> = {}): SaleLine => ({
  id: 'line-1', createdAt: 0, updatedAt: 0, saleId: 'sale-1',
  itemId: 'item-1', nameSnapshot: 'Keychain', priceSnapshot: 15000,
  typeNameSnapshot: 'Keychain', creatorNameSnapshot: 'Mika',
  kind: 'regular', quantity: 2,
  ...over,
})

const opts = { now: 5000, makeId: () => 'adj-1' }

describe('voidSale', () => {
  test('marks the sale voided but keeps its numbers', () => {
    const r = voidSale(makeSale(), [makeLine()], opts)
    if (!r.ok) throw new Error('should be ok')
    expect(r.sale).toMatchObject({
      status: 'voided', voidedAt: 5000,
      total: 29200, discount: 1000, roundingAdjustment: 200,
    })
  })

  test('creates a reversing adjustment that gives regular stock back', () => {
    const r = voidSale(makeSale(), [makeLine()], opts)
    if (!r.ok) throw new Error('should be ok')
    expect(r.adjustments).toEqual([expect.objectContaining({
      itemId: 'item-1', pool: 'regular', delta: 2, reason: 'void', saleId: 'sale-1',
    })])
  })

  test('PO pickups restore poStock, not regular stock', () => {
    const r = voidSale(makeSale(), [makeLine({ kind: 'preorder', quantity: 1 })], opts)
    if (!r.ok) throw new Error('should be ok')
    expect(r.adjustments[0]).toMatchObject({ pool: 'po', delta: 1 })
  })

  test('voiding twice is refused (no double restore)', () => {
    const r = voidSale(makeSale({ status: 'voided' }), [makeLine()], opts)
    expect(r).toEqual({ ok: false, error: { reason: 'already_voided' } })
  })

  test('lines from another sale are refused', () => {
    const r = voidSale(makeSale(), [makeLine({ saleId: 'other-sale' })], opts)
    expect(r).toEqual({ ok: false, error: { reason: 'lines_mismatch' } })
  })

  test('sell then void puts stock back exactly where it started', () => {
    const start = makeItem()
    const sold = checkout(
      { saleId: 'sale-1', eventId: 'ev-1', lines: [
        { itemId: 'item-1', kind: 'regular', quantity: 2 },
        { itemId: 'item-1', kind: 'preorder', quantity: 1 },
      ] },
      { items: new Map([[start.id, start]]), types: new Map(), creators: new Map() },
      { method: 'qris' },
      { now: 1000 },
    )
    if (!sold.ok) throw new Error('checkout failed')

    let item = start
    for (const c of sold.stockChanges) item = applyStockDelta(item, c.pool, c.delta)
    expect(item).toMatchObject({ stock: 3, poStock: 1 })

    const voided = voidSale(sold.sale, sold.lines, opts)
    if (!voided.ok) throw new Error('void failed')
    for (const a of voided.adjustments) item = applyStockDelta(item, a.pool, a.delta)
    expect(item).toMatchObject({ stock: 5, poStock: 2 })
  })

  test('only paid sales count in reports', () => {
    expect(countsInReports(makeSale())).toBe(true)
    expect(countsInReports(makeSale({ status: 'voided' }))).toBe(false)
  })

  test('applyStockDelta refuses to go below zero', () => {
    expect(() => applyStockDelta(makeItem({ stock: 1 }), 'regular', -2)).toThrow()
  })
})