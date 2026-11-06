// Spec 17.5: QuotaExceededError while saving -> the atomic transaction fails,
// no success message, and the app says "storage full, export now".
// Dexie may wrap the browser error, so walk inner/cause too.
export function isQuotaError(e: unknown): boolean {
  const seen = new Set<unknown>()
  let cur: unknown = e
  while (cur && typeof cur === 'object' && !seen.has(cur)) {
    seen.add(cur)
    const o = cur as { name?: string; inner?: unknown; cause?: unknown }
    if (o.name === 'QuotaExceededError') return true
    cur = o.inner ?? o.cause
  }
  return false
}

// Thrown INSIDE a transaction to abort it with a typed reason (everything rolls back).
export class TxAbort<E> extends Error {
  readonly detail: E
  constructor(detail: E) {
    super('transaction aborted')
    this.detail = detail
  }
}

export type DbFailure = { reason: 'storage_full' } | { reason: 'unknown'; message: string }

export function toDbFailure(e: unknown): DbFailure {
  if (isQuotaError(e)) return { reason: 'storage_full' }
  return { reason: 'unknown', message: e instanceof Error ? e.message : String(e) }
}
