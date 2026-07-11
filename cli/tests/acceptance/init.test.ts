import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { init } from '@/commands/init.js';

describe('init', () => {
  let tmpDir: string;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'ripe-test-'));
    nock.cleanAll();
    nock.disableNetConnect();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    nock.cleanAll();
    nock.enableNetConnect();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('exits 0 with warning when .ripe/config.json already exists', async () => {
    mkdirSync(join(tmpDir, '.ripe'), { recursive: true });
    writeFileSync(
      join(tmpDir, '.ripe/config.json'),
      JSON.stringify({ projectId: 'proj_existing123', serverUrl: 'http://localhost:3000' }),
    );

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn: async () => 'http://localhost:3000',
    });

    expect(result.status).toBe('success');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('proj_existing123'));
  });

  it('re-registers when .ripe/config.json is empty', async () => {
    mkdirSync(join(tmpDir, '.ripe'), { recursive: true });
    writeFileSync(join(tmpDir, '.ripe/config.json'), '');

    nock('http://localhost:3000')
      .post('/api/projects', { name: tmpDir.split('/').pop() })
      .reply(201, { projectId: 'proj_abc123' });

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn: async () => 'http://localhost:3000',
    });

    expect(result.exitCode).toBe(0);
    expect(warnSpy).not.toHaveBeenCalled();

    const config = JSON.parse(readFileSync(join(tmpDir, '.ripe/config.json'), 'utf-8')) as {
      projectId: string;
      serverUrl: string;
    };

    expect(config.projectId).toBe('proj_abc123');
    expect(config.serverUrl).toBe('http://localhost:3000');
  });

  it('re-registers when .ripe/config.json contains malformed JSON', async () => {
    mkdirSync(join(tmpDir, '.ripe'), { recursive: true });
    writeFileSync(join(tmpDir, '.ripe/config.json'), '{ not valid json');

    nock('http://localhost:3000')
      .post('/api/projects', { name: tmpDir.split('/').pop() })
      .reply(201, { projectId: 'proj_abc123' });

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn: async () => 'http://localhost:3000',
    });

    expect(result.exitCode).toBe(0);
    expect(warnSpy).not.toHaveBeenCalled();

    const config = JSON.parse(readFileSync(join(tmpDir, '.ripe/config.json'), 'utf-8')) as {
      projectId: string;
      serverUrl: string;
    };

    expect(config.projectId).toBe('proj_abc123');
    expect(config.serverUrl).toBe('http://localhost:3000');
  });

  it('re-registers when .ripe/config.json is missing projectId', async () => {
    mkdirSync(join(tmpDir, '.ripe'), { recursive: true });
    writeFileSync(
      join(tmpDir, '.ripe/config.json'),
      JSON.stringify({ serverUrl: 'http://localhost:3000' }),
    );

    nock('http://localhost:3000')
      .post('/api/projects', { name: tmpDir.split('/').pop() })
      .reply(201, { projectId: 'proj_abc123' });

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn: async () => 'http://localhost:3000',
    });

    expect(result.exitCode).toBe(0);
    expect(warnSpy).not.toHaveBeenCalled();

    const config = JSON.parse(readFileSync(join(tmpDir, '.ripe/config.json'), 'utf-8')) as {
      projectId: string;
      serverUrl: string;
    };

    expect(config.projectId).toBe('proj_abc123');
    expect(config.serverUrl).toBe('http://localhost:3000');
  });

  it('re-registers when .ripe/config.json is missing serverUrl', async () => {
    mkdirSync(join(tmpDir, '.ripe'), { recursive: true });
    writeFileSync(
      join(tmpDir, '.ripe/config.json'),
      JSON.stringify({ projectId: 'proj_existing123' }),
    );

    nock('http://localhost:3000')
      .post('/api/projects', { name: tmpDir.split('/').pop() })
      .reply(201, { projectId: 'proj_abc123' });

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn: async () => 'http://localhost:3000',
    });

    expect(result.exitCode).toBe(0);
    expect(warnSpy).not.toHaveBeenCalled();

    const config = JSON.parse(readFileSync(join(tmpDir, '.ripe/config.json'), 'utf-8')) as {
      projectId: string;
      serverUrl: string;
    };

    expect(config.projectId).toBe('proj_abc123');
    expect(config.serverUrl).toBe('http://localhost:3000');
  });

  it('creates .ripe/config.json with projectId and serverUrl on 201', async () => {
    nock('http://localhost:3000')
      .post('/api/projects', { name: tmpDir.split('/').pop() })
      .reply(201, { projectId: 'proj_abc123' });

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn: async () => 'http://localhost:3000',
    });

    expect(result.status).toBe('success');

    const config = JSON.parse(readFileSync(join(tmpDir, '.ripe/config.json'), 'utf-8')) as {
      projectId: string;
      serverUrl: string;
    };

    expect(config.projectId).toBe('proj_abc123');
    expect(config.serverUrl).toBe('http://localhost:3000');
  });

  it('writes config and exits 0 on 409 when user confirms', async () => {
    nock('http://localhost:3000')
      .post('/api/projects')
      .reply(409, { projectId: 'proj_existing', message: 'Project already exists' });

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn: async () => 'http://localhost:3000',
      promptFn: async () => true,
    });

    expect(result.status).toBe('success');

    const config = JSON.parse(readFileSync(join(tmpDir, '.ripe/config.json'), 'utf-8')) as {
      projectId: string;
    };

    expect(config.projectId).toBe('proj_existing');
  });

  it('exits 0 without writing config on 409 when user declines', async () => {
    nock('http://localhost:3000')
      .post('/api/projects')
      .reply(409, { projectId: 'proj_existing', message: 'Project already exists' });

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn: async () => 'http://localhost:3000',
      promptFn: async () => false,
    });

    expect(result.status).toBe('success');
    expect(existsSync(join(tmpDir, '.ripe/config.json'))).toBe(false);
  });

  it('re-prompts on invalid URL until a valid one is provided', async () => {
    nock('http://localhost:3000').post('/api/projects').reply(201, { projectId: 'proj_abc123' });

    const urls = ['not-a-url', 'ftp://example.com', 'http://localhost:3000'];
    let call = 0;

    const result = await init({
      currentDirectoryName: tmpDir,
      // biome-ignore lint/style/noNonNullAssertion: this is safe because the last URL is valid
      urlPromptFn: async () => urls[call++]!,
    });

    expect(result.status).toBe('success');
    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid server URL: "not-a-url"'),
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid server URL: "ftp://example.com"'),
    );
  });

  it('exits 1 and prints to stderr when server is unreachable', async () => {
    nock('http://localhost:3000')
      .post('/api/projects')
      .replyWithError('connect ECONNREFUSED 127.0.0.1:3000');

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn: async () => 'http://localhost:3000',
    });

    expect(result.status).toBe('error');
    expect(errorSpy).toHaveBeenCalled();
  });
});
