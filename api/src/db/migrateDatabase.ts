import { migrate } from '@blackglory/better-sqlite3-migrations';
import type Database from 'better-sqlite3';
import { migrations } from './migrations.js';

export function migrateDatabase(db: Database.Database): void {
  migrate(db, migrations);
}
