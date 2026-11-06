import Dexie from 'dexie'
import type { Table } from 'dexie'
import type {
  BoothEvent, Bundle, ClosingCount, Creator, ID, ItemType, Item, LogEntry,
  Sale, SaleLine, Settings, StockAdjustment, StoredImage, Variant,
} from '../core/types'

// Dexie v1 with ALL tables from day one (spec section 9 / 11.4 L1).
// Indexes only where the app will query; every table is keyed by `id` (UUID).
export class MetroBoothDB extends Dexie {
  settings!: Table<Settings, ID>
  events!: Table<BoothEvent, ID>
  types!: Table<ItemType, ID>
  creators!: Table<Creator, ID>
  images!: Table<StoredImage, ID>
  items!: Table<Item, ID>
  variants!: Table<Variant, ID>
  bundles!: Table<Bundle, ID>
  sales!: Table<Sale, ID>
  saleLines!: Table<SaleLine, ID>
  stockAdjustments!: Table<StockAdjustment, ID>
  closingCounts!: Table<ClosingCount, ID>
  logs!: Table<LogEntry, ID>

  constructor(name = 'metrobooth') {
    super(name)
    this.version(1).stores({
      settings: 'id',
      events: 'id, status, startedAt',
      types: 'id, eventId',
      creators: 'id, eventId',
      images: 'id',
      items: 'id, eventId, typeId, creatorId, deletedAt',
      variants: 'id, itemId',
      bundles: 'id, eventId, itemId',
      sales: 'id, eventId, createdAt, [eventId+status]',
      saleLines: 'id, saleId, itemId',
      stockAdjustments: 'id, eventId, itemId, saleId, createdAt',
      closingCounts: 'id, eventId, itemId',
      logs: 'id, eventId, createdAt',
    })
  }
}
