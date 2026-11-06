import { applyStockDelta } from '../core/stock'
import { voidSale } from '../core/void'
import type { VoidError, VoidOptions } from '../core/void'
import type { StockChange } from '../core/checkout'
import type { ID, Sale, SaleLine, StockAdjustment, Timestamp } from '../core/types'
import { db as defaultDb } from './instance'
import type { MetroBoothDB } from './schema'
import { TxAbort, toDbFailure } from './errors'
import type { DbFailure } from './errors'

export type StockTxError =
  | { reason: 'missing_item'; itemId: ID }
  | { reason: 'not_enough_stock'; itemId: ID; left: number }

// Runs INSIDE a transaction: re-reads the item, applies the delta, writes it back.
// Re-reading here (not trusting the cart's copy) is what makes two tabs safe (spec 17.5).
async function applyChangeTx(db: MetroBoothDB, change: StockChange, now: Timestamp) {
  const item = await db.items.get(change.itemId)
  if (!item) throw new TxAbort<StockTxError>({ reason: 'missing_item', itemId: change.itemId })
  let next
  try {
    next = applyStockDelta(item, change.pool, change.delta)
  } catch {
    const left = change.pool === 'regular' ? item.stock : item.poStock
    throw new TxAbort<StockTxError>({ reason: 'not_enough_stock', itemId: item.id, left })
  }
  await db.items.put({ ...next, updatedAt: now })
}

// ---------- Save sale ----------
export interface SaveSaleInput {
  sale: Sale
  lines: SaleLine[]
  stockChanges: StockChange[]
}

export type SaveSaleError = StockTxError | DbFailure

export type SaveSaleResult =
  | { ok: true; duplicate: boolean; sale: Sale } // duplicate = this sale id was already saved; nothing changed
  | { ok: false; error: SaveSaleError }

export async function saveSale(
  input: SaveSaleInput,
  db: MetroBoothDB = defaultDb,
): Promise<SaveSaleResult> {
  const { sale, lines, stockChanges } = input
  try {
    return await db.transaction('rw', [db.sales, db.saleLines, db.items], async () => {
      // Idempotent: same cart = same sale id, so a double tap saves once.
      const existing = await db.sales.get(sale.id)
      if (existing) return { ok: true as const, duplicate: true, sale: existing }

      for (const change of stockChanges) await applyChangeTx(db, change, sale.createdAt)
      await db.sales.add(sale) // backstop: a second add of the same id throws
      await db.saleLines.bulkAdd(lines)
      return { ok: true as const, duplicate: false, sale }
    })
  } catch (e) {
    if (e instanceof TxAbort) return { ok: false, error: e.detail as StockTxError }
    // Two saves racing past the get(): the loser hits the unique id, which is also a duplicate.
    if ((e as { name?: string })?.name === 'ConstraintError') {
      const existing = await db.sales.get(sale.id)
      if (existing) return { ok: true, duplicate: true, sale: existing }
    }
    return { ok: false, error: toDbFailure(e) }
  }
}

// ---------- Void sale ----------
export type VoidSaleTxError = VoidError | { reason: 'not_found' } | DbFailure

export type VoidSaleTxResult =
  | { ok: true; sale: Sale; adjustments: StockAdjustment[] }
  | { ok: false; error: VoidSaleTxError }

export async function voidSaleTx(
  saleId: ID,
  opts: VoidOptions = {},
  db: MetroBoothDB = defaultDb,
): Promise<VoidSaleTxResult> {
  const now = opts.now ?? Date.now()
  try {
    return await db.transaction(
      'rw',
      [db.sales, db.saleLines, db.stockAdjustments, db.items],
      async () => {
        // Read INSIDE the transaction so a second tab can't void twice.
        const sale = await db.sales.get(saleId)
        if (!sale) throw new TxAbort<VoidSaleTxError>({ reason: 'not_found' })
        const lines = await db.saleLines.where('saleId').equals(saleId).toArray()

        const r = voidSale(sale, lines, { ...opts, now })
        if (!r.ok) throw new TxAbort<VoidSaleTxError>(r.error)

        await db.sales.put(r.sale)
        await db.stockAdjustments.bulkAdd(r.adjustments)
        for (const adj of r.adjustments) {
          await applyChangeTx(db, { itemId: adj.itemId, pool: adj.pool, delta: adj.delta }, now)
        }
        return { ok: true as const, sale: r.sale, adjustments: r.adjustments }
      },
    )
  } catch (e) {
    if (e instanceof TxAbort) return { ok: false, error: e.detail as VoidSaleTxError }
    return { ok: false, error: toDbFailure(e) }
  }
}
