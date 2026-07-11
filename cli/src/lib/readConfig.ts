import { existsSync, readFileSync } from 'node:fs';
import type { RipeConfig } from './writeConfig.js';

function isValidRipeConfig(value: unknown): value is RipeConfig {
  if (typeof value !== 'object' || value === null) return false;

  const config = value as Record<string, unknown>;

  return (
    typeof config.projectId === 'string' &&
    config.projectId.length > 0 &&
    typeof config.serverUrl === 'string' &&
    config.serverUrl.length > 0
  );
}

export function readConfig(configPath: string): RipeConfig | undefined {
  if (!existsSync(configPath)) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch {
    return undefined;
  }

  return isValidRipeConfig(parsed) ? parsed : undefined;
}
