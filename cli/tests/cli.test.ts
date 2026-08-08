import { describe, expect, it, vi } from 'vitest'
import { runCli } from '@/cli.js'

describe('runCli', () => {
  it.each([[['-h']], [['--help']], [['init', '-h']], [['init', '--help']]])(
    'prints help and exits 0 for %j without dispatching to a command',
    async (argv) => {
      const logFn = vi.fn()
      const initFn = vi.fn()

      const result = await runCli(argv, { logFn, initFn })

      expect(result.exitCode).toBe(0)
      expect(logFn).toHaveBeenCalledWith(expect.stringContaining('Usage'))
      expect(logFn).toHaveBeenCalledWith(expect.stringContaining('init'))
      expect(initFn).not.toHaveBeenCalled()
    },
  )

  it('dispatches to init for the "init" command', async () => {
    const initFn = vi.fn().mockResolvedValue({ status: 'success' })

    const result = await runCli(['init'], { initFn })

    expect(initFn).toHaveBeenCalledOnce()
    expect(result.exitCode).toBe(0)
  })

  it.each([
    [[], '(none)'],
    [['foo'], 'foo'],
  ])('errors and exits 1 with a help hint for %j', async (argv, expectedSubstring) => {
    const errorFn = vi.fn()
    const initFn = vi.fn()

    const result = await runCli(argv, { errorFn, initFn })

    expect(result.exitCode).toBe(1)
    expect(errorFn).toHaveBeenCalledWith(expect.stringContaining(expectedSubstring))
    expect(errorFn).toHaveBeenCalledWith(expect.stringContaining('ripe --help'))
    expect(initFn).not.toHaveBeenCalled()
  })
})
