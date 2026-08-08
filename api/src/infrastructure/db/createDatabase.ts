import Database from 'better-sqlite3'

export function createDatabase(path: string): Database.Database {
  return new Database(path)
}
