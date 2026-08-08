import type { Logger } from '@/cli.js'
import { type CommandResult, init } from '@/commands/init.js'
import { buildInitPresenter } from '@/commands/init.presenter.js'
import { buildInitPrompter } from '@/commands/init.prompter.js'
import { createCacheStore } from '@/lib/cacheStore.js'
import { createGitRepository } from '@/lib/gitRepository.js'
import { createProjectDirectory } from '@/lib/projectDirectory.js'
import { createSettingsStore } from '@/lib/settingsStore.js'

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
