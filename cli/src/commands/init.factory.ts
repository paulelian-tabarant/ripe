import type { Logger } from '../cli.js'
import { createCacheStore } from '../infrastructure/cache-store.js'
import { createGitRepository } from '../infrastructure/git-repository.js'
import { createProjectDirectory } from '../infrastructure/project-directory.js'
import { createSettingsStore } from '../infrastructure/settings-store.js'
import { type CommandResult, init } from './init.js'
import { buildInitPresenter } from './init.presenter.js'
import { buildInitPrompter } from './init.prompter.js'

export function buildInitFn(
  ask: (question: string) => Promise<string>,
  logger: Logger,
): () => Promise<CommandResult> {
  const projectDirectory = createProjectDirectory(() => process.cwd())
  const prompter = buildInitPrompter(ask)
  const presenter = buildInitPresenter(logger)
  const gitRepository = createGitRepository(projectDirectory)
  const settingsStore = createSettingsStore(projectDirectory)
  const cacheStore = createCacheStore(projectDirectory)

  return () =>
    init({
      projectDirectory,
      prompter,
      presenter,
      gitRepository,
      settingsStore,
      cacheStore,
    })
}
