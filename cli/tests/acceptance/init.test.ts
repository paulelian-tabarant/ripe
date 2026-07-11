import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { init } from '@/commands/init.js';
import type {
  RegisterProjectRequestBody,
  RegisterProjectResponseBody,
} from '@/lib/registerProject.js';

const FAKE_SERVER_URL = 'https://fake-server-url';

interface WrittenConfig {
  projectId: string;
  serverUrl: string;
}

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
    writeExistingConfig(
      JSON.stringify({ projectId: 'proj_existing123', serverUrl: FAKE_SERVER_URL }),
    );

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn: async () => FAKE_SERVER_URL,
    });

    expect(result.status).toBe('success');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('proj_existing123'));
  });

  it('re-registers when .ripe/config.json is empty', async () => {
    writeExistingConfig('');

    stubRegisterProjectApi(201, { projectId: 'proj_abc123' }, { name: basename(tmpDir) });

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn: async () => FAKE_SERVER_URL,
    });

    expect(result.status).toBe('success');

    const config = readWrittenConfig();

    expect(config.projectId).toBe('proj_abc123');
    expect(config.serverUrl).toBe(FAKE_SERVER_URL);
  });

  it('re-registers when .ripe/config.json contains malformed JSON', async () => {
    writeExistingConfig('{ not valid json');

    stubRegisterProjectApi(201, { projectId: 'proj_abc123' }, { name: basename(tmpDir) });

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn: async () => FAKE_SERVER_URL,
    });

    expect(result.status).toBe('success');

    const config = readWrittenConfig();

    expect(config.projectId).toBe('proj_abc123');
    expect(config.serverUrl).toBe(FAKE_SERVER_URL);
  });

  it('re-registers when .ripe/config.json is missing projectId', async () => {
    writeExistingConfig(JSON.stringify({ serverUrl: FAKE_SERVER_URL }));

    stubRegisterProjectApi(201, { projectId: 'proj_abc123' }, { name: basename(tmpDir) });

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn: async () => FAKE_SERVER_URL,
    });

    expect(result.status).toBe('success');

    const config = readWrittenConfig();

    expect(config.projectId).toBe('proj_abc123');
    expect(config.serverUrl).toBe(FAKE_SERVER_URL);
  });

  it('re-registers when .ripe/config.json is missing serverUrl', async () => {
    writeExistingConfig(JSON.stringify({ projectId: 'proj_existing123' }));

    stubRegisterProjectApi(201, { projectId: 'proj_abc123' }, { name: basename(tmpDir) });

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn: async () => FAKE_SERVER_URL,
    });

    expect(result.status).toBe('success');

    const config = readWrittenConfig();

    expect(config.projectId).toBe('proj_abc123');
    expect(config.serverUrl).toBe(FAKE_SERVER_URL);
  });

  it('re-registers when .ripe/config.json has an empty projectId', async () => {
    writeExistingConfig(JSON.stringify({ projectId: '', serverUrl: FAKE_SERVER_URL }));

    stubRegisterProjectApi(201, { projectId: 'proj_abc123' }, { name: basename(tmpDir) });

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn: async () => FAKE_SERVER_URL,
    });

    expect(result.status).toBe('success');

    const config = readWrittenConfig();

    expect(config.projectId).toBe('proj_abc123');
    expect(config.serverUrl).toBe(FAKE_SERVER_URL);
  });

  it('re-registers when .ripe/config.json has an empty serverUrl', async () => {
    writeExistingConfig(JSON.stringify({ projectId: 'proj_existing123', serverUrl: '' }));

    stubRegisterProjectApi(201, { projectId: 'proj_abc123' }, { name: basename(tmpDir) });

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn: async () => FAKE_SERVER_URL,
    });

    expect(result.status).toBe('success');

    const config = readWrittenConfig();

    expect(config.projectId).toBe('proj_abc123');
    expect(config.serverUrl).toBe(FAKE_SERVER_URL);
  });

  it('creates .ripe/config.json with projectId and serverUrl on 201', async () => {
    stubRegisterProjectApi(201, { projectId: 'proj_abc123' }, { name: basename(tmpDir) });

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn: async () => FAKE_SERVER_URL,
    });

    expect(result.status).toBe('success');

    const config = readWrittenConfig();

    expect(config.projectId).toBe('proj_abc123');
    expect(config.serverUrl).toBe(FAKE_SERVER_URL);
  });

  it('writes config and exits 0 on 409 when user confirms', async () => {
    stubRegisterProjectApi(409, { projectId: 'proj_existing', message: 'Project already exists' });

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn: async () => FAKE_SERVER_URL,
      promptFn: async () => true,
    });

    expect(result.status).toBe('success');

    const config = readWrittenConfig();

    expect(config.projectId).toBe('proj_existing');
  });

  it('exits 0 without writing config on 409 when user declines', async () => {
    stubRegisterProjectApi(409, { projectId: 'proj_existing', message: 'Project already exists' });

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn: async () => FAKE_SERVER_URL,
      promptFn: async () => false,
    });

    expect(result.status).toBe('success');
    expect(existsSync(join(tmpDir, '.ripe/config.json'))).toBe(false);
  });

  it('re-prompts on invalid URL until a valid one is provided', async () => {
    stubRegisterProjectApi(201, { projectId: 'proj_abc123' });

    const urls = ['not-a-url', 'ftp://example.com', FAKE_SERVER_URL];
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
    nock(FAKE_SERVER_URL)
      .post('/api/projects')
      .replyWithError('connect ECONNREFUSED 127.0.0.1:3000');

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn: async () => FAKE_SERVER_URL,
    });

    expect(result.status).toBe('error');
    expect(errorSpy).toHaveBeenCalled();
  });

  function writeExistingConfig(content: string): void {
    mkdirSync(join(tmpDir, '.ripe'), { recursive: true });
    writeFileSync(join(tmpDir, '.ripe/config.json'), content);
  }

  function readWrittenConfig(): WrittenConfig {
    return JSON.parse(readFileSync(join(tmpDir, '.ripe/config.json'), 'utf-8')) as WrittenConfig;
  }
});

function stubRegisterProjectApi(
  status: number,
  body: RegisterProjectResponseBody,
  requestBody?: RegisterProjectRequestBody,
): void {
  nock(FAKE_SERVER_URL)
    .post('/api/projects', requestBody as nock.RequestBodyMatcher | undefined)
    .reply(status, body);
}
