import type { IMigration } from '@blackglory/better-sqlite3-migrations'

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
  {
    version: 2,
    up: `
      CREATE TABLE projects_new (
        id         TEXT    PRIMARY KEY,
        name       TEXT    NOT NULL,
        repo_key   TEXT    NOT NULL UNIQUE,
        remote_url TEXT    NOT NULL
      );
      INSERT INTO projects_new (id, name, repo_key, remote_url)
        SELECT id, name, name, '' FROM projects;
      DROP TABLE projects;
      ALTER TABLE projects_new RENAME TO projects;
    `,
    down: `
      CREATE TABLE projects_old (
        id         TEXT    PRIMARY KEY,
        name       TEXT    NOT NULL UNIQUE
      );
      INSERT INTO projects_old (id, name) SELECT id, name FROM projects;
      DROP TABLE projects;
      ALTER TABLE projects_old RENAME TO projects;
    `,
  },
]
