import { describe, expect, it, vi } from 'vitest'
import type { Logger, RunCliOptions } from '@/cli.js'
import { runCli } from '@/cli.js'

describe('runCli', () => {
  it.each([[['-h']], [['--help']], [['init', '-h']], [['init', '--help']]])(
    'prints help and exits 0 for %j without dispatching to a command',
    async (argv) => {
      const log = vi.fn()
      const initFn = vi.fn()

      const result = await runCli(argv, fakeRunCliOptions({ logger: fakeLogger({ log }), initFn }))

      expect(result.exitCode).toBe(0)
      expect(log).toHaveBeenCalledWith(expect.stringContaining('Usage'))
      expect(log).toHaveBeenCalledWith(expect.stringContaining('init'))
      expect(initFn).not.toHaveBeenCalled()
    },
  )

  it('dispatches to init for the "init" command', async () => {
    const initFn = vi.fn().mockResolvedValue({ status: 'success' })

    const result = await runCli(['init'], fakeRunCliOptions({ initFn }))

    expect(initFn).toHaveBeenCalledOnce()
    expect(result.exitCode).toBe(0)
  })

  it.each([
    [[], '(none)'],
    [['foo'], 'foo'],
  ])('errors and exits 1 with a help hint for %j', async (argv, expectedSubstring) => {
    const error = vi.fn()
    const initFn = vi.fn()

    const result = await runCli(argv, fakeRunCliOptions({ logger: fakeLogger({ error }), initFn }))

    expect(result.exitCode).toBe(1)
    expect(error).toHaveBeenCalledWith(expect.stringContaining(expectedSubstring))
    expect(error).toHaveBeenCalledWith(expect.stringContaining('ripe --help'))
    expect(initFn).not.toHaveBeenCalled()
  })
})

function unexpectedCall(name: string): (...args: unknown[]) => never {
  return (...args: unknown[]) => {
    throw new Error(`${name} should not have been called, but was called with: ${String(args)}`)
  }
}

function fakeLogger(overrides: Partial<Logger> = {}): Logger {
  return {
    log: unexpectedCall('logger.log'),
    error: unexpectedCall('logger.error'),
    warn: unexpectedCall('logger.warn'),
    ...overrides,
  }
}

function fakeRunCliOptions(overrides: Partial<RunCliOptions> = {}): RunCliOptions {
  return {
    logger: fakeLogger(),
    askFn: unexpectedCall('askFn'),
    initFn: unexpectedCall('initFn'),
    ...overrides,
  }
}
