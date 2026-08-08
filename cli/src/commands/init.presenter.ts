import type { Logger } from '@/cli.js'
import type { InitPresenter } from '@/commands/init.js'
import type { ProjectRegistrationResult } from '@/lib/server.js'

export function buildInitPresenter(logger: Logger): InitPresenter {
  return {
    onInvalidServerUrl: (url: string): void =>
      logger.error(`Invalid server URL: "${url}". Must be a valid http or https URL.`),
    onProjectRegistered: (result: ProjectRegistrationResult): void =>
      logger.log(
        result.wasAlreadyExisting
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
