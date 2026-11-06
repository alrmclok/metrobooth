import { describe, expect, it } from 'vitest'
import { isQuotaError } from './errors'
import { PERSIST_DENIED_KEY, requestPersistence } from './storage'
import type { PersistDeps } from './storage'

const memKv = (): PersistDeps['kv'] => {
  const m = new Map<string, string>()
  return { get: k => m.get(k) ?? null, set: (k, v) => void m.set(k, v) }
}

describe('requestPersistence', () => {
  it('unsupported without the API', async () => {
    expect(await requestPersistence({ kv: memKv() })).toBe('unsupported')
  })

  it('already persisted', async () => {
    const storage = { persisted: async () => true, persist: async () => true }
    expect(await requestPersistence({ storage, kv: memKv() })).toBe('already')
  })

  it('granted', async () => {
    const storage = { persisted: async () => false, persist: async () => true }
    expect(await requestPersistence({ storage, kv: memKv() })).toBe('granted')
  })

  it('denied once, then never asked again', async () => {
    let asked = 0
    const kv = memKv()
    const storage = { persisted: async () => false, persist: async () => { asked++; return false } }
    expect(await requestPersistence({ storage, kv })).toBe('denied')
    expect(kv.get(PERSIST_DENIED_KEY)).toBe('1')
    expect(await requestPersistence({ storage, kv })).toBe('skipped')
    expect(asked).toBe(1)
  })
})

describe('isQuotaError', () => {
  it('detects direct and wrapped QuotaExceededError', () => {
    expect(isQuotaError({ name: 'QuotaExceededError' })).toBe(true)
    expect(isQuotaError({ name: 'AbortError', inner: { name: 'QuotaExceededError' } })).toBe(true)
    expect(isQuotaError(new Error('boom'))).toBe(false)
    expect(isQuotaError(null)).toBe(false)
  })
})
