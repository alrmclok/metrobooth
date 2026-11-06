// Spec 17.5: ask the browser for persistent storage; if denied, remember it,
// show one small note, and never keep asking.
export const PERSIST_DENIED_KEY = 'metrobooth.persistDenied'

export interface PersistDeps {
  storage?: { persisted(): Promise<boolean>; persist(): Promise<boolean> }
  kv: { get(key: string): string | null; set(key: string, value: string): void }
}

export type PersistOutcome = 'already' | 'granted' | 'denied' | 'unsupported' | 'skipped'

function defaultDeps(): PersistDeps {
  const ls = (() => {
    try { return globalThis.localStorage } catch { return undefined }
  })()
  return {
    storage: typeof navigator !== 'undefined' ? navigator.storage : undefined,
    kv: {
      get: k => { try { return ls?.getItem(k) ?? null } catch { return null } },
      set: (k, v) => { try { ls?.setItem(k, v) } catch { /* ignore */ } },
    },
  }
}

// 'skipped' = denied before; don't ask again. UI shows its one-time note on 'denied'.
export async function requestPersistence(deps: PersistDeps = defaultDeps()): Promise<PersistOutcome> {
  const s = deps.storage
  if (!s?.persist || !s.persisted) return 'unsupported'
  try {
    if (await s.persisted()) return 'already'
    if (deps.kv.get(PERSIST_DENIED_KEY) === '1') return 'skipped'
    if (await s.persist()) return 'granted'
    deps.kv.set(PERSIST_DENIED_KEY, '1')
    return 'denied'
  } catch {
    return 'unsupported'
  }
}
