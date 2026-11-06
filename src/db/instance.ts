import { MetroBoothDB } from './schema'

// The one app-wide connection. Repository functions default to this;
// tests pass their own MetroBoothDB with a unique name instead.
export const db = new MetroBoothDB()
