import { join } from 'node:path'
import { migrate } from '@blackglory/better-sqlite3-migrations'
import Database from 'better-sqlite3'
import { buildApp } from './app.js'
import { loadConfig } from './infrastructure/config.js'
import { migrations } from './infrastructure/db/migrations.js'

function main(): void {
  const { databasePath, port, shouldServeBuiltFrontend } = loadConfig()

  const db = new Database(databasePath)
  db.pragma('foreign_keys = ON')
  migrate(db, migrations)

  const staticDir = join(process.cwd(), 'static')
  const app = buildApp(db, { shouldServeBuiltFrontend, staticDir })

  app.listen({ port, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      process.stderr.write(`${err.message}\n`)
      process.exit(1)
    }

    process.stdout.write(`Server listening at ${address}\n`)
  })
}

try {
  main()
} catch (err) {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
}
