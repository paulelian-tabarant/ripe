import { migrate } from '@blackglory/better-sqlite3-migrations'
import Database from 'better-sqlite3'
import { migrations } from '../../src/infrastructure/db/migrations.js'

export function createTestDb(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  migrate(db, migrations)

  return db
}
