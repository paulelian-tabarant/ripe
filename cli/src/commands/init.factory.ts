import type { InitPresenter, InitPrompter, InitResult } from '@/commands/init.js'
import { init } from '@/commands/init.js'

export function buildInitFn(
  prompter: InitPrompter,
  presenter: InitPresenter,
): () => Promise<InitResult> {
  return () =>
    init({
      getCurrentDirectoryName: () => process.cwd(),
      prompter,
      presenter,
    })
}
