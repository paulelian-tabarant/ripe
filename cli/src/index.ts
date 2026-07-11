#!/usr/bin/env node
import { runCli } from './cli.js';

const args = process.argv.slice(2);

try {
  const { exitCode } = await runCli(args);
  process.exit(exitCode);
} catch (err: unknown) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
