import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readConfig } from '@/lib/readConfig.js';

describe('readConfig', () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'ripe-test-'));
    configPath = join(tmpDir, '.ripe/config.json');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns null when the file does not exist', () => {
    expect(readConfig(configPath)).toBeNull();
  });

  it('returns null when the file is empty', () => {
    mkdirSync(join(tmpDir, '.ripe'), { recursive: true });
    writeFileSync(configPath, '');

    expect(readConfig(configPath)).toBeNull();
  });

  it('returns null when the file contains malformed JSON', () => {
    mkdirSync(join(tmpDir, '.ripe'), { recursive: true });
    writeFileSync(configPath, '{ not valid json');

    expect(readConfig(configPath)).toBeNull();
  });

  it('returns null when projectId is missing', () => {
    mkdirSync(join(tmpDir, '.ripe'), { recursive: true });
    writeFileSync(configPath, JSON.stringify({ serverUrl: 'http://localhost:3000' }));

    expect(readConfig(configPath)).toBeNull();
  });

  it('returns null when projectId is empty', () => {
    mkdirSync(join(tmpDir, '.ripe'), { recursive: true });
    writeFileSync(
      configPath,
      JSON.stringify({ projectId: '', serverUrl: 'http://localhost:3000' }),
    );

    expect(readConfig(configPath)).toBeNull();
  });

  it('returns null when serverUrl is missing', () => {
    mkdirSync(join(tmpDir, '.ripe'), { recursive: true });
    writeFileSync(configPath, JSON.stringify({ projectId: 'proj_abc123' }));

    expect(readConfig(configPath)).toBeNull();
  });

  it('returns null when serverUrl is empty', () => {
    mkdirSync(join(tmpDir, '.ripe'), { recursive: true });
    writeFileSync(configPath, JSON.stringify({ projectId: 'proj_abc123', serverUrl: '' }));

    expect(readConfig(configPath)).toBeNull();
  });

  it('returns the parsed config when projectId and serverUrl are present', () => {
    mkdirSync(join(tmpDir, '.ripe'), { recursive: true });
    writeFileSync(
      configPath,
      JSON.stringify({ projectId: 'proj_abc123', serverUrl: 'http://localhost:3000' }),
    );

    expect(readConfig(configPath)).toEqual({
      projectId: 'proj_abc123',
      serverUrl: 'http://localhost:3000',
    });
  });
});
