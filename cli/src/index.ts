#!/usr/bin/env node
import { createInterface } from 'node:readline/promises'
import { buildInitFn, type CliResult, runCli } from './cli.js'

async function askFn(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    return await rl.question(question)
  } finally {
    rl.close()
  }
}

const { exitCode }: CliResult = await runCli(process.argv.slice(2), {
  logFn: console.log,
  errorFn: console.error,
  warnFn: console.warn,
  askFn,
  initFn: buildInitFn(askFn, console.log, console.error),
})
process.exit(exitCode)
