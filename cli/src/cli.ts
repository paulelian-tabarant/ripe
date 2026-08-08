import type { InitResult } from './commands/init.js'

const HELP_FLAGS = new Set(['-h', '--help'])

const HELP_TEXT = `Usage: ripe <command>

Commands:
  init    Register this project with a ripe tracking server and write .ripe/settings.json and .ripe/cache.json

Options:
  -h, --help    Show this help message and exit
`

export interface CliResult {
  exitCode: 0 | 1
}

export interface Logger {
  log: (message: string) => void
  error: (message: string) => void
  warn: (message: string) => void
}

export interface RunCliOptions {
  logger: Logger
  ask: (question: string) => Promise<string>
  init: () => Promise<InitResult>
}

export async function runCli(args: string[], options: RunCliOptions): Promise<CliResult> {
  const { logger, init } = options
  const [command] = args

  if (args.some((arg) => HELP_FLAGS.has(arg))) {
    logger.log(HELP_TEXT)

    return { exitCode: 0 }
  }

  if (command === 'init') {
    const result = await init()

    return { exitCode: result === 'success' ? 0 : 1 }
  }

  logger.error(`Unknown command: ${command ?? '(none)'}`)
  logger.error("Run 'ripe --help' for usage.")

  return { exitCode: 1 }
}
