#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const STARTUP_TIMEOUT_MS = 5000
const ADDRESS_PATTERN = /Server listening at (http:\/\/[^\s"}]+)/

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.listen(0, () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
    server.on('error', reject)
  })
}

const tmpDir = mkdtempSync(join(tmpdir(), 'ripe-api-smoke-'))
const databasePath = join(tmpDir, 'smoke.sqlite')
const port = await getFreePort()

const child = spawn('node', ['dist/index.js'], {
  env: { ...process.env, DATABASE_PATH: databasePath, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
})

let stderr = ''
child.stderr.on('data', (chunk) => {
  stderr += chunk.toString()
})

function fail(message) {
  child.kill()
  rmSync(tmpDir, { recursive: true, force: true })
  console.error(`smoke test failed: ${message}`)
  if (stderr) console.error(stderr)
  process.exit(1)
}

function succeed() {
  child.kill()
  rmSync(tmpDir, { recursive: true, force: true })
  console.log('smoke test passed: server booted and /api/health responded ok')
  process.exit(0)
}

const timeout = setTimeout(
  () => fail(`server did not become healthy within ${STARTUP_TIMEOUT_MS}ms`),
  STARTUP_TIMEOUT_MS,
)

child.on('exit', (code) => {
  if (code !== null) fail(`server process exited early with code ${code}`)
})

let buffered = ''
child.stdout.on('data', async (chunk) => {
  buffered += chunk.toString()
  const match = buffered.match(ADDRESS_PATTERN)
  if (!match) return

  try {
    const response = await fetch(`${match[1]}/api/health`)
    if (!response.ok) return fail(`GET /api/health returned status ${response.status}`)

    const body = await response.json()
    if (body.status !== 'ok')
      return fail(`GET /api/health returned unexpected body: ${JSON.stringify(body)}`)

    clearTimeout(timeout)
    succeed()
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
})
