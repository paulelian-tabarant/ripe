import {
  type InitOptions,
  type InitPresenter,
  type InitPrompts,
  type InitResult,
  init,
} from './commands/init.js'
import type { ProjectRegistrationResult } from './lib/registerProject.js'

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
  askFn: (question: string) => Promise<string>
  initFn: () => Promise<InitResult>
}

export async function runCli(args: string[], options: RunCliOptions): Promise<CliResult> {
  const { logger, initFn } = options
  const [command] = args

  if (args.some((arg) => HELP_FLAGS.has(arg))) {
    logger.log(HELP_TEXT)

    return { exitCode: 0 }
  }

  if (command === 'init') {
    const result = await initFn()

    return { exitCode: result.status === 'success' ? 0 : 1 }
  }

  logger.error(`Unknown command: ${command ?? '(none)'}`)
  logger.error("Run 'ripe --help' for usage.")

  return { exitCode: 1 }
}

export function buildInitFn(
  askFn: (question: string) => Promise<string>,
  logger: Logger,
): () => Promise<InitResult> {
  const prompts = buildInitPrompts(askFn)
  const presenter = buildInitPresenter(logger)
  const options: InitOptions = {
    getCurrentDirectoryName: () => process.cwd(),
    prompts,
    presenter,
  }

  return () => init(options)
}

export function buildInitPresenter(logger: Logger): InitPresenter {
  return {
    onInvalidServerUrl: (url: string): void =>
      logger.error(`Invalid server URL: "${url}". Must be a valid http or https URL.`),
    onProjectRegistered: (result: ProjectRegistrationResult): void =>
      logger.log(
        result.created
          ? `Project registered: ${result.projectId}`
          : `Using existing project ID: ${result.projectId}`,
      ),
    onRemoteUrlError: (detail?: string): void => {
      logger.error('Error: could not determine the git remote URL for this directory')
      if (detail) logger.error(detail)
    },
    onServerRejectedRemoteUrl: (remoteUrl: string, detail?: string): void => {
      logger.error(`Error: the server rejected this remote URL: "${remoteUrl}"`)
      if (detail) logger.error(detail)
    },
    onServerUnreachable: (serverUrl: string, detail?: string): void => {
      logger.error(`Error: could not reach server at ${serverUrl}`)
      if (detail) logger.error(detail)
    },
    onLocalStateWriteFailed: (detail?: string): void => {
      logger.error(
        'Error: registered successfully, but failed to save local state — run ripe init again to retry.',
      )
      if (detail) logger.error(detail)
    },
  }
}

export function buildInitPrompts(askFn: (question: string) => Promise<string>): InitPrompts {
  return {
    promptForServerUrl: (): Promise<string> => askFn('Server URL: '),
    promptAnotherServerUrl: (): Promise<string> => askFn('Please enter another server URL: '),
    promptToConfirmServerUrl: (existingUrl: string): Promise<boolean> =>
      askFn(`Found existing server URL: "${existingUrl}". Keep it? (y/n) `).then(
        (answer) => answer.toLowerCase() === 'y',
      ),
    promptForHttpsRemote: (remoteUrl: string): Promise<string> =>
      askFn(`Your git remote ("${remoteUrl}") isn't HTTPS. Enter the HTTPS URL for this repo: `),
  }
}
