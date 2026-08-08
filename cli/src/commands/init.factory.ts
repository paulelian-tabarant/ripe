import type { Logger } from '@/cli.js'
import { type CommandResult, init } from '@/commands/init.js'
import { buildInitPresenter } from '@/commands/init.presenter.js'
import { buildInitPrompter } from '@/commands/init.prompter.js'
import { createCacheStore } from '@/lib/cacheStore.js'
import { createGitRepository } from '@/lib/gitRepository.js'
import { createSettingsStore } from '@/lib/settingsStore.js'

export function buildInitFn(
  ask: (question: string) => Promise<string>,
  logger: Logger,
): () => Promise<CommandResult> {
  const getCurrentDirectoryName = (): string => process.cwd()
  const prompter = buildInitPrompter(ask)
  const presenter = buildInitPresenter(logger)
  const gitRepository = createGitRepository(getCurrentDirectoryName)
  const settingsStore = createSettingsStore(getCurrentDirectoryName)
  const cacheStore = createCacheStore(getCurrentDirectoryName)

  return () =>
    init({
      getCurrentDirectoryName,
      prompter,
      presenter,
      gitRepository,
      settingsStore,
      cacheStore,
    })
}
