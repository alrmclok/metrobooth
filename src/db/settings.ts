import { DEFAULT_DENOMINATIONS } from '../core/cash'
import type { Settings } from '../core/types'
import { db as defaultDb } from './instance'
import type { MetroBoothDB } from './schema'

export const SETTINGS_ID = 'settings'

export function defaultSettings(now: number = Date.now()): Settings {
  return {
    id: SETTINGS_ID,
    createdAt: now,
    updatedAt: now,
    theme: 'flat-white',
    boothName: '',
    successText: 'Thank you!',
    roundingStep: 0,
    roundingMode: 'nearest',
    denominations: [...DEFAULT_DENOMINATIONS],
    developerOptionsEnabled: false,
    lowStockThreshold: 3,
    currency: 'IDR',
    language: 'id',
    soundEnabled: false,
    keepAwake: false,
    largeText: false,
    highContrast: false,
    reduceDecoration: false,
  }
}

// Single record; seeded on first read. Safe to call on every launch.
export function getSettings(db: MetroBoothDB = defaultDb): Promise<Settings> {
  return db.transaction('rw', db.settings, async () => {
    const found = await db.settings.get(SETTINGS_ID)
    if (found) return found
    const fresh = defaultSettings()
    await db.settings.add(fresh)
    return fresh
  })
}

export type SettingsPatch = Partial<Omit<Settings, 'id' | 'createdAt' | 'updatedAt'>>

export function updateSettings(
  patch: SettingsPatch,
  db: MetroBoothDB = defaultDb,
): Promise<Settings> {
  return db.transaction('rw', db.settings, async () => {
    const current = (await db.settings.get(SETTINGS_ID)) ?? defaultSettings()
    const next: Settings = { ...current, ...patch, id: SETTINGS_ID, updatedAt: Date.now() }
    await db.settings.put(next)
    return next
  })
}
