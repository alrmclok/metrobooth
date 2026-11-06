import { describe, expect, test } from 'vitest'
import { addToCart, cartSubtotal, createCart, isPickupOnly, removeOneFromCart } from './cart'
import type { Item } from './types'

const makeItem = (over: Partial<Item> = {}): Item => ({
  id: 'item-1', createdAt: 0, updatedAt: 0, eventId: 'ev-1',
  name: 'Keychain', price: 15000, stock: 3, startingStock: 3,
  poStock: 0, startingPoStock: 0, poPrice: 0,
  sortOrder: 0, hasVariants: false,
  ...over,
})

describe('cart', () => {
  test('adding the same item raises quantity, not a new line', () => {
    const item = makeItem()
    let cart = createCart('ev-1')
    for (let i = 0; i < 2; i++) {
      const r = addToCart(cart, item, 'regular')
      if (r.ok) cart = r.cart
    }
    expect(cart.lines).toEqual([{ itemId: 'item-1', kind: 'regular', quantity: 2 }])
  })

  test('blocked at tap time when stock runs out', () => {
    const item = makeItem({ stock: 1 })
    const first = addToCart(createCart('ev-1'), item, 'regular')
    expect(first.ok).toBe(true)
    if (!first.ok) return
    const second = addToCart(first.cart, item, 'regular')
    expect(second).toEqual({ ok: false, reason: 'not_enough_stock', left: 0 })
  })

  test('PO lines use poStock, not regular stock', () => {
    const item = makeItem({ stock: 0, poStock: 2 })
    expect(addToCart(createCart('ev-1'), item, 'regular').ok).toBe(false)
    expect(addToCart(createCart('ev-1'), item, 'preorder').ok).toBe(true)
  })

  test('deleted items cannot be added', () => {
    const item = makeItem({ deletedAt: 123 })
    expect(addToCart(createCart('ev-1'), item, 'regular'))
      .toEqual({ ok: false, reason: 'unavailable' })
  })

  test('subtotal reprices live when the item price changes', () => {
    const item = makeItem()
    const r = addToCart(createCart('ev-1'), item, 'regular')
    if (!r.ok) throw new Error('add failed')
    expect(cartSubtotal(r.cart, new Map([[item.id, item]]))).toBe(15000)
    const edited = { ...item, price: 20000 }
    expect(cartSubtotal(r.cart, new Map([[item.id, edited]]))).toBe(20000)
  })

  test('PO lines cost poPrice (Rp 0 by default)', () => {
    const item = makeItem({ poStock: 1 })
    const r = addToCart(createCart('ev-1'), item, 'preorder')
    if (!r.ok) throw new Error('add failed')
    expect(cartSubtotal(r.cart, new Map([[item.id, item]]))).toBe(0)
    expect(isPickupOnly(r.cart)).toBe(true)
  })

  test('saleId stays the same as the cart changes', () => {
    const item = makeItem()
    const cart = createCart('ev-1')
    const r = addToCart(cart, item, 'regular')
    if (!r.ok) throw new Error('add failed')
    expect(r.cart.saleId).toBe(cart.saleId)
  })

  test('functions do not mutate the old cart', () => {
    const item = makeItem()
    const cart = createCart('ev-1')
    addToCart(cart, item, 'regular')
    expect(cart.lines).toHaveLength(0)
  })

  test('removing the last one removes the line', () => {
    const item = makeItem()
    const r = addToCart(createCart('ev-1'), item, 'regular')
    if (!r.ok) throw new Error('add failed')
    expect(removeOneFromCart(r.cart, item.id, 'regular').lines).toEqual([])
  })
})