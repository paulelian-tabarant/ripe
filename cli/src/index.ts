#!/usr/bin/env node
import { createInterface } from 'node:readline/promises'
import { buildInitFn } from '@/commands/init.factory.js'
import { type ExitCode, type Logger, runCli } from './cli.js'

const logger: Logger = { log: console.log, error: console.error, warn: console.warn }

async function askFn(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    return await rl.question(question)
  } finally {
    rl.close()
  }
}

const exitCode: ExitCode = await runCli(process.argv.slice(2), {
  logger,
  ask: askFn,
  init: buildInitFn(askFn, logger),
})

process.exit(exitCode)
