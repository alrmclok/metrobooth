import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MetroBoothDB } from './schema'
import { saveSale, voidSaleTx } from './sales'
import { makeItem, makeSaleInput } from './testing'

let db: MetroBoothDB
let n = 0
beforeEach(async () => {
  db = new MetroBoothDB(`mb-sales-${++n}`)
  await db.open()
  await db.items.bulkAdd([
    makeItem({ id: 'a', stock: 5, poStock: 2 }),
    makeItem({ id: 'b', stock: 1, poStock: 0 }),
  ])
})
afterEach(async () => { await db.delete() })

const stockOf = async (id: string) => {
  const it = await db.items.get(id)
  return { stock: it!.stock, po: it!.poStock }
}

describe('saveSale', () => {
  it('stores sale + lines and deducts both pools', async () => {
    const r = await saveSale(
      makeSaleInput('s1', [{ itemId: 'a', qty: 2 }, { itemId: 'a', qty: 1, kind: 'preorder' }]), db)
    expect(r).toMatchObject({ ok: true, duplicate: false })
    expect(await db.sales.count()).toBe(1)
    expect(await db.saleLines.where('saleId').equals('s1').count()).toBe(2)
    expect(await stockOf('a')).toEqual({ stock: 3, po: 1 })
  })

  it('saving the same sale twice is idempotent (stock deducted once)', async () => {
    const input = makeSaleInput('s1', [{ itemId: 'a', qty: 2 }])
    await saveSale(input, db)
    const again = await saveSale(input, db)
    expect(again).toMatchObject({ ok: true, duplicate: true })
    expect(await db.sales.count()).toBe(1)
    expect(await db.saleLines.count()).toBe(1)
    expect((await stockOf('a')).stock).toBe(3)
  })

  it('double tap racing in parallel still saves once', async () => {
    const input = makeSaleInput('s1', [{ itemId: 'a', qty: 2 }])
    const [r1, r2] = await Promise.all([saveSale(input, db), saveSale(input, db)])
    expect([r1, r2].filter(r => r.ok && !r.duplicate)).toHaveLength(1)
    expect((await stockOf('a')).stock).toBe(3)
  })

  it('re-checks stock inside the transaction and writes nothing on failure', async () => {
    const r = await saveSale(makeSaleInput('s1', [{ itemId: 'a', qty: 9 }]), db)
    expect(r).toEqual({ ok: false, error: { reason: 'not_enough_stock', itemId: 'a', left: 5 } })
    expect(await db.sales.count()).toBe(0)
    expect(await db.saleLines.count()).toBe(0)
    expect((await stockOf('a')).stock).toBe(5)
  })

  it('rolls back earlier stock changes when a later line fails', async () => {
    const r = await saveSale(
      makeSaleInput('s1', [{ itemId: 'a', qty: 2 }, { itemId: 'b', qty: 3 }]), db)
    expect(r).toMatchObject({ ok: false, error: { reason: 'not_enough_stock', itemId: 'b', left: 1 } })
    expect((await stockOf('a')).stock).toBe(5)
    expect(await db.sales.count()).toBe(0)
  })

  it('two different sales racing for the last unit: exactly one wins', async () => {
    const [r1, r2] = await Promise.all([
      saveSale(makeSaleInput('s1', [{ itemId: 'b', qty: 1 }]), db),
      saveSale(makeSaleInput('s2', [{ itemId: 'b', qty: 1 }]), db),
    ])
    expect([r1, r2].filter(r => r.ok)).toHaveLength(1)
    expect([r1, r2].filter(r => !r.ok)).toHaveLength(1)
    expect((await stockOf('b')).stock).toBe(0)
    expect(await db.sales.count()).toBe(1)
  })

  it('reports a missing item', async () => {
    const r = await saveSale(makeSaleInput('s1', [{ itemId: 'nope', qty: 1 }]), db)
    expect(r).toEqual({ ok: false, error: { reason: 'missing_item', itemId: 'nope' } })
  })
})

describe('voidSaleTx', () => {
  it('marks voided, restores stock, writes reversing adjustments', async () => {
    await saveSale(
      makeSaleInput('s1', [{ itemId: 'a', qty: 2 }, { itemId: 'a', qty: 1, kind: 'preorder' }]), db)
    const r = await voidSaleTx('s1', { now: 123 }, db)
    expect(r.ok).toBe(true)
    expect((await db.sales.get('s1'))!.status).toBe('voided')
    expect((await db.sales.get('s1'))!.voidedAt).toBe(123)
    expect(await stockOf('a')).toEqual({ stock: 5, po: 2 })
    const adj = await db.stockAdjustments.where('saleId').equals('s1').toArray()
    expect(adj).toHaveLength(2)
    expect(adj.every(a => a.reason === 'void' && a.delta > 0)).toBe(true)
    expect(await db.saleLines.where('saleId').equals('s1').count()).toBe(2) // history kept
  })

  it('refuses a second void and does not restore stock twice', async () => {
    await saveSale(makeSaleInput('s1', [{ itemId: 'a', qty: 2 }]), db)
    await voidSaleTx('s1', {}, db)
    const again = await voidSaleTx('s1', {}, db)
    expect(again).toEqual({ ok: false, error: { reason: 'already_voided' } })
    expect((await stockOf('a')).stock).toBe(5)
    expect(await db.stockAdjustments.count()).toBe(1)
  })

  it('two voids racing: only one applies', async () => {
    await saveSale(makeSaleInput('s1', [{ itemId: 'a', qty: 2 }]), db)
    const rs = await Promise.all([voidSaleTx('s1', {}, db), voidSaleTx('s1', {}, db)])
    expect(rs.filter(r => r.ok)).toHaveLength(1)
    expect((await stockOf('a')).stock).toBe(5)
  })

  it('unknown sale id', async () => {
    expect(await voidSaleTx('zzz', {}, db)).toEqual({ ok: false, error: { reason: 'not_found' } })
  })
})
