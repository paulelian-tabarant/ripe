import { describe, expect, it, vi } from 'vitest'
import type { RunCliOptions } from '@/cli.js'
import { runCli } from '@/cli.js'

describe('runCli', () => {
  it.each([[['-h']], [['--help']], [['init', '-h']], [['init', '--help']]])(
    'prints help and exits 0 for %j without dispatching to a command',
    async (argv) => {
      const logFn = vi.fn()
      const initFn = vi.fn()

      const result = await runCli(argv, fakeRunCliOptions({ logFn, initFn }))

      expect(result.exitCode).toBe(0)
      expect(logFn).toHaveBeenCalledWith(expect.stringContaining('Usage'))
      expect(logFn).toHaveBeenCalledWith(expect.stringContaining('init'))
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
    const errorFn = vi.fn()
    const initFn = vi.fn()

    const result = await runCli(argv, fakeRunCliOptions({ errorFn, initFn }))

    expect(result.exitCode).toBe(1)
    expect(errorFn).toHaveBeenCalledWith(expect.stringContaining(expectedSubstring))
    expect(errorFn).toHaveBeenCalledWith(expect.stringContaining('ripe --help'))
    expect(initFn).not.toHaveBeenCalled()
  })
})

function unexpectedCall(name: string): (...args: unknown[]) => never {
  return (...args: unknown[]) => {
    throw new Error(`${name} should not have been called, but was called with: ${String(args)}`)
  }
}

function fakeRunCliOptions(overrides: Partial<RunCliOptions> = {}): RunCliOptions {
  return {
    logFn: unexpectedCall('logFn'),
    errorFn: unexpectedCall('errorFn'),
    warnFn: unexpectedCall('warnFn'),
    askFn: unexpectedCall('askFn'),
    initFn: unexpectedCall('initFn'),
    ...overrides,
  }
}
