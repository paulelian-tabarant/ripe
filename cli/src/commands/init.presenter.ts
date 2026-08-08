import type { Logger } from '../cli.js'
import type { SkillSkipReason } from '../infrastructure/skill-scanner.js'
import type { InitPresenter } from './init.js'

export function buildInitPresenter(logger: Logger): InitPresenter {
  return {
    onInvalidServerUrl: (url: string): void =>
      logger.error(`Invalid server URL: "${url}". Must be a valid http or https URL.`),
    onProjectCreated: (projectId: string): void => logger.log(`Project registered: ${projectId}`),
    onProjectAlreadyExisting: (projectId: string): void =>
      logger.log(`Using existing project ID: ${projectId}`),
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
    onNoLocalMainBranch: (): void => {
      logger.error(
        'Error: no local "main" branch found — cannot scan for skills committed on main.',
      )
    },
    onNoSkillsFound: (): void => {
      logger.warn('Warning: no skills found in .claude/skills/ on main — nothing to register.')
    },
    onSkillSkipped: (path: string, reason: SkillSkipReason): void => {
      const reasonText =
        reason === 'namespaced'
          ? 'its name is namespaced (contains ":")'
          : reason === 'malformed-frontmatter'
            ? 'its frontmatter is missing or malformed'
            : 'it is not committed on main'
      logger.warn(`Warning: skipping skill at "${path}" — ${reasonText}.`)
    },
    onSkillRegistrationFailed: (detail?: string): void => {
      logger.error('Error: failed to register skills with the server.')
      if (detail) logger.error(detail)
    },
  }
}
