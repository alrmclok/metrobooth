import { newId } from './ids'
import type { ID, Sale, SaleLine, StockAdjustment, Timestamp } from './types'

export type VoidError =
  | { reason: 'already_voided' }
  | { reason: 'lines_mismatch' }

export type VoidResult =
  | { ok: true; sale: Sale; adjustments: StockAdjustment[] }
  | { ok: false; error: VoidError }

export interface VoidOptions {
  now?: Timestamp
  makeId?: () => ID
}

// Reports must only count paid sales. A voided sale keeps its numbers
// (history is never deleted), so total, discount and rounding all drop out together.
export const countsInReports = (sale: Sale): boolean => sale.status === 'paid'

// Voiding never deletes anything: the sale is marked 'voided' and a
// reversing StockAdjustment (reason 'void') is created for every line.
export function voidSale(
  sale: Sale,
  lines: readonly SaleLine[],
  opts: VoidOptions = {},
): VoidResult {
  const now = opts.now ?? Date.now()
  const makeId = opts.makeId ?? newId

  // Voiding twice would restore stock twice, so refuse.
  if (sale.status === 'voided') return { ok: false, error: { reason: 'already_voided' } }
  if (lines.length === 0 || lines.some(l => l.saleId !== sale.id)) {
    return { ok: false, error: { reason: 'lines_mismatch' } }
  }

  const adjustments: StockAdjustment[] = lines.map(line => ({
    id: makeId(), createdAt: now, updatedAt: now,
    eventId: sale.eventId,
    itemId: line.itemId,
    ...(line.variantId !== undefined && { variantId: line.variantId }),
    pool: line.kind === 'regular' ? 'regular' : 'po',
    delta: line.quantity, // positive: stock comes back
    reason: 'void',
    saleId: sale.id,
  }))

  return {
    ok: true,
    sale: { ...sale, status: 'voided', voidedAt: now, updatedAt: now },
    adjustments,
  }
}