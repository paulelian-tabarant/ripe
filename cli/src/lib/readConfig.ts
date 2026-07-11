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

/**
 * Reads and validates the `.ripe/config.json` file at `configPath`.
 *
 * Returns the parsed config only if the file exists, contains valid JSON, and has
 * non-empty `projectId` and `serverUrl` fields. Otherwise returns `null`, treating the
 * project as not (yet) registered.
 */
export function readConfig(configPath: string): RipeConfig | null {
  if (!existsSync(configPath)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch {
    return null;
  }

  return isValidRipeConfig(parsed) ? parsed : null;
}
