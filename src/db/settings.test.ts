import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MetroBoothDB } from './schema'
import { SETTINGS_ID, getSettings, updateSettings } from './settings'

let db: MetroBoothDB
let n = 0
beforeEach(async () => { db = new MetroBoothDB(`mb-settings-${++n}`); await db.open() })
afterEach(async () => { await db.delete() })

describe('schema', () => {
  it('opens at version 1 with every table from spec section 9', () => {
    expect(db.verno).toBe(1)
    const names = db.tables.map(t => t.name).sort()
    expect(names).toEqual([
      'bundles', 'closingCounts', 'creators', 'events', 'images', 'items', 'logs',
      'saleLines', 'sales', 'settings', 'stockAdjustments', 'types', 'variants',
    ])
  })
})

describe('settings', () => {
  it('seeds defaults once as a single record', async () => {
    const a = await getSettings(db)
    const b = await getSettings(db)
    expect(a.id).toBe(SETTINGS_ID)
    expect(a.lowStockThreshold).toBe(3)
    expect(b.createdAt).toBe(a.createdAt)
    expect(await db.settings.count()).toBe(1)
  })

  it('updateSettings patches and keeps one record', async () => {
    await getSettings(db)
    const s = await updateSettings({ boothName: 'Mochi Booth', roundingStep: 500 }, db)
    expect(s.boothName).toBe('Mochi Booth')
    expect((await getSettings(db)).roundingStep).toBe(500)
    expect(await db.settings.count()).toBe(1)
  })

  it('updateSettings works before the first read (seeds first)', async () => {
    await updateSettings({ boothName: 'X' }, db)
    expect((await getSettings(db)).lowStockThreshold).toBe(3)
  })
})
