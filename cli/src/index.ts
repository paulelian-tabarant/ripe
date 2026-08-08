#!/usr/bin/env node
import { createInterface } from 'node:readline/promises'
import { buildInitFn } from '@/commands/init.factory.js'
import { buildInitPresenter } from '@/commands/init.presenter.js'
import { buildInitPrompter } from '@/commands/init.prompter.js'
import { type CliResult, type Logger, runCli } from './cli.js'

const consoleLogger: Logger = { log: console.log, error: console.error, warn: console.warn }

async function stdAsk(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    return await rl.question(question)
  } finally {
    rl.close()
  }
}

const initPrompter = buildInitPrompter(stdAsk)
const initPresenter = buildInitPresenter(consoleLogger)

const { exitCode }: CliResult = await runCli(process.argv.slice(2), {
  logger: consoleLogger,
  ask: stdAsk,
  init: buildInitFn(initPrompter, initPresenter),
})
process.exit(exitCode)
