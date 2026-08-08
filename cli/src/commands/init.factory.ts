import type { Logger } from '@/cli.js'
import { type CommandResult, init } from '@/commands/init.js'
import { buildInitPresenter } from '@/commands/init.presenter.js'
import { buildInitPrompter } from '@/commands/init.prompter.js'

export function buildInitFn(
  ask: (question: string) => Promise<string>,
  logger: Logger,
): () => Promise<CommandResult> {
  const prompter = buildInitPrompter(ask)
  const presenter = buildInitPresenter(logger)

  return () =>
    init({
      getCurrentDirectoryName: () => process.cwd(),
      prompter,
      presenter,
    })
}
