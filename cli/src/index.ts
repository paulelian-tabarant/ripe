#!/usr/bin/env node
import { init } from './commands/init.js';

const [, , command]: string[] = process.argv;

async function main(): Promise<void> {
  if (command === 'init') {
    const { exitCode } = await init();
    process.exit(exitCode);
  } else {
    console.error(`Unknown command: ${command ?? '(none)'}`);
    process.exit(1);
  }
}

try {
    await main();
} catch (err: unknown) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
