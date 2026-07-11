import { describe, expect, it, vi } from 'vitest';
import { runCli } from '@/cli.js';

describe('runCli', () => {
  it('prints help and exits 0 for "-h" without dispatching to a command', async () => {
    const logFn = vi.fn();
    const initFn = vi.fn();

    const result = await runCli(['-h'], { logFn, initFn });

    expect(result.exitCode).toBe(0);
    expect(logFn).toHaveBeenCalledWith(expect.stringContaining('init'));
    expect(initFn).not.toHaveBeenCalled();
  });

  it('prints help and exits 0 for "--help"', async () => {
    const logFn = vi.fn();

    const result = await runCli(['--help'], { logFn });

    expect(result.exitCode).toBe(0);
    expect(logFn).toHaveBeenCalledWith(expect.stringContaining('Usage'));
  });

  it('prints help and exits 0 for "init -h" without running init', async () => {
    const logFn = vi.fn();
    const initFn = vi.fn();

    const result = await runCli(['init', '-h'], { logFn, initFn });

    expect(result.exitCode).toBe(0);
    expect(initFn).not.toHaveBeenCalled();
  });

  it('prints help and exits 0 for "init --help" without running init', async () => {
    const logFn = vi.fn();
    const initFn = vi.fn();

    const result = await runCli(['init', '--help'], { logFn, initFn });

    expect(result.exitCode).toBe(0);
    expect(initFn).not.toHaveBeenCalled();
  });

  it('dispatches to init for the "init" command', async () => {
    const initFn = vi.fn().mockResolvedValue({ exitCode: 0 });

    const result = await runCli(['init'], { initFn });

    expect(initFn).toHaveBeenCalledOnce();
    expect(result.exitCode).toBe(0);
  });

  it('errors and exits 1 with a help hint when no command is given', async () => {
    const errorFn = vi.fn();
    const initFn = vi.fn();

    const result = await runCli([], { errorFn, initFn });

    expect(result.exitCode).toBe(1);
    expect(errorFn).toHaveBeenCalledWith(expect.stringContaining('(none)'));
    expect(errorFn).toHaveBeenCalledWith(expect.stringContaining('ripe --help'));
    expect(initFn).not.toHaveBeenCalled();
  });

  it('errors and exits 1 with a help hint for an unknown command', async () => {
    const errorFn = vi.fn();

    const result = await runCli(['foo'], { errorFn });

    expect(result.exitCode).toBe(1);
    expect(errorFn).toHaveBeenCalledWith(expect.stringContaining('foo'));
    expect(errorFn).toHaveBeenCalledWith(expect.stringContaining('ripe --help'));
  });
});
