import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export interface RipeConfig {
  projectId: string;
  serverUrl: string;
}

export function writeConfig(configPath: string, config: RipeConfig): void {
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf-8');
}
