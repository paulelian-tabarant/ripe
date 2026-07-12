import { join } from 'node:path'
import { buildApp } from './app.js'
import { loadConfig } from './config.js'
import { createDatabase } from './db/createDatabase.js'

function main(): void {
  const { databasePath, port, shouldServeBuiltFrontend } = loadConfig()
  const db = createDatabase(databasePath)
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
