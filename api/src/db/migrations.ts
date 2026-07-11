import type { IMigration } from '@blackglory/better-sqlite3-migrations';

export const migrations: IMigration[] = [
  {
    version: 1,
    up: `
      CREATE TABLE IF NOT EXISTS projects (
        id         TEXT    PRIMARY KEY,
        name       TEXT    NOT NULL UNIQUE
      )
    `,
    down: 'DROP TABLE IF EXISTS projects',
  },
];
