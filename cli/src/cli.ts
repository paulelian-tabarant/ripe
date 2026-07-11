import { type InitResult, init } from './commands/init.js'

const HELP_FLAGS = new Set(['-h', '--help'])

const HELP_TEXT = `Usage: ripe <command>

Commands:
  init    Register this project with a ripe tracking server and write .ripe/config.json

Options:
  -h, --help    Show this help message and exit
`

export interface CliResult {
  exitCode: 0 | 1
}

export interface RunCliOptions {
  logFn?: (message: string) => void
  errorFn?: (message: string) => void
  initFn?: () => Promise<InitResult>
}

export async function runCli(args: string[], options: RunCliOptions = {}): Promise<CliResult> {
  const logFn = options.logFn ?? console.log
  const errorFn = options.errorFn ?? console.error
  const initFn = options.initFn ?? init
  const [command] = args

  if (args.some((arg) => HELP_FLAGS.has(arg))) {
    logFn(HELP_TEXT)

    return { exitCode: 0 }
  }

  if (command === 'init') {
    const result = await initFn()

    return { exitCode: result.status === 'success' ? 0 : 1 }
  }

  errorFn(`Unknown command: ${command ?? '(none)'}`)
  errorFn("Run 'ripe --help' for usage.")

  return { exitCode: 1 }
}
