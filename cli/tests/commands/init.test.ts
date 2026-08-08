import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import type {
  RegisterProjectRequestBody,
  RegisterProjectResponseBody,
} from '@ripe/api/contracts/projects.js'
import nock from 'nock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { InitOptions, InitPresenter, InitPrompter } from '@/commands/init.js'
import { init } from '@/commands/init.js'
import type { RipeCache } from '@/lib/writeCache.js'
import * as writeCacheModule from '@/lib/writeCache.js'
import type { RipeSettings } from '@/lib/writeSettings.js'

const FAKE_SERVER_URL = 'https://fake-server-url'
const FAKE_REMOTE_URL = 'git@github.com:acme/widgets.git'
const FAKE_HTTPS_REMOTE_URL = 'https://github.com/acme/widgets'

describe('init', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'ripe-test-'))
    execFileSync('git', ['init'], { cwd: tmpDir })
    execFileSync('git', ['remote', 'add', 'origin', FAKE_REMOTE_URL], { cwd: tmpDir })
    nock.cleanAll()
    nock.disableNetConnect()
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
    nock.cleanAll()
    nock.enableNetConnect()
  })

  it('creates .ripe/settings.json and .ripe/cache.json with serverUrl and projectId on 201', async () => {
    stubRegisterProjectApi(
      201,
      { projectId: 'proj_abc123' },
      { name: basename(tmpDir), remoteUrl: FAKE_HTTPS_REMOTE_URL },
    )
    const onProjectRegistered = vi.fn()

    const result = await init(
      fakeInitOptions({
        getCurrentDirectoryName: () => tmpDir,
        prompts: {
          promptForServerUrl: async () => FAKE_SERVER_URL,
          promptForHttpsRemote: async () => FAKE_HTTPS_REMOTE_URL,
        },
        presenter: { onProjectRegistered },
      }),
    )

    expect(result).toBe('success')
    expect(readWrittenSettings().serverUrl).toBe(FAKE_SERVER_URL)
    expect(readWrittenCache().projectId).toBe('proj_abc123')
    expect(onProjectRegistered).toHaveBeenCalledWith({ created: true, projectId: 'proj_abc123' })
  })

  it('reports a retryable error, without crashing, when saving local state fails after a successful registration', async () => {
    stubRegisterProjectApi(
      201,
      { projectId: 'proj_abc123' },
      { name: basename(tmpDir), remoteUrl: FAKE_HTTPS_REMOTE_URL },
    )
    const writeCacheSpy = vi.spyOn(writeCacheModule, 'writeCache').mockImplementation(() => {
      throw new Error('ENOSPC: no space left on device')
    })
    const onLocalStateWriteFailed = vi.fn()

    const result = await init(
      fakeInitOptions({
        getCurrentDirectoryName: () => tmpDir,
        prompts: {
          promptForServerUrl: async () => FAKE_SERVER_URL,
          promptForHttpsRemote: async () => FAKE_HTTPS_REMOTE_URL,
        },
        presenter: { onProjectRegistered: vi.fn(), onLocalStateWriteFailed },
      }),
    )

    expect(result).toBe('error')
    expect(onLocalStateWriteFailed).toHaveBeenCalledWith(
      expect.stringContaining('ENOSPC: no space left on device'),
    )

    writeCacheSpy.mockRestore()
  })

  it('writes settings and cache on 200 (existing project) with no confirmation prompt', async () => {
    stubRegisterProjectApi(200, { projectId: 'proj_existing' })
    const onProjectRegistered = vi.fn()

    const result = await init(
      fakeInitOptions({
        getCurrentDirectoryName: () => tmpDir,
        prompts: {
          promptForServerUrl: async () => FAKE_SERVER_URL,
          promptForHttpsRemote: async () => FAKE_HTTPS_REMOTE_URL,
        },
        presenter: { onProjectRegistered },
      }),
    )

    expect(result).toBe('success')
    expect(readWrittenSettings().serverUrl).toBe(FAKE_SERVER_URL)
    expect(readWrittenCache().projectId).toBe('proj_existing')
    expect(onProjectRegistered).toHaveBeenCalledWith({
      created: false,
      projectId: 'proj_existing',
    })
  })

  it('re-prompts on invalid URL until a valid one is provided', async () => {
    stubRegisterProjectApi(201, { projectId: 'proj_abc123' })
    const urls = ['not-a-url', 'ftp://example.com', FAKE_SERVER_URL]
    let call = 0
    const onInvalidServerUrl = vi.fn()

    const result = await init(
      fakeInitOptions({
        getCurrentDirectoryName: () => tmpDir,
        prompts: {
          // biome-ignore lint/style/noNonNullAssertion: this is safe because the last URL is valid
          promptForServerUrl: async () => urls[call++]!,
          // biome-ignore lint/style/noNonNullAssertion: this is safe because the last URL is valid
          promptAnotherServerUrl: async () => urls[call++]!,
          promptForHttpsRemote: async () => FAKE_HTTPS_REMOTE_URL,
        },
        presenter: { onInvalidServerUrl, onProjectRegistered: vi.fn() },
      }),
    )

    expect(result).toBe('success')
    expect(onInvalidServerUrl).toHaveBeenCalledTimes(2)
    expect(onInvalidServerUrl).toHaveBeenCalledWith('not-a-url')
    expect(onInvalidServerUrl).toHaveBeenCalledWith('ftp://example.com')
  })

  it('reports the server as unreachable when it cannot be reached', async () => {
    nock(FAKE_SERVER_URL)
      .post('/api/projects')
      .replyWithError('connect ECONNREFUSED 127.0.0.1:3000')
    const onServerUnreachable = vi.fn()

    const result = await init(
      fakeInitOptions({
        getCurrentDirectoryName: () => tmpDir,
        prompts: {
          promptForServerUrl: async () => FAKE_SERVER_URL,
          promptForHttpsRemote: async () => FAKE_HTTPS_REMOTE_URL,
        },
        presenter: { onServerUnreachable },
      }),
    )

    expect(result).toBe('error')
    expect(onServerUnreachable).toHaveBeenCalledWith(
      FAKE_SERVER_URL,
      expect.stringContaining('ECONNREFUSED'),
    )
  })

  it('reports a rejected-remote error (not "unreachable") on a 400', async () => {
    stubRegisterProjectApi(400, {} as RegisterProjectResponseBody)
    const onServerRejectedRemoteUrl = vi.fn()
    const onServerUnreachable = vi.fn()

    const result = await init(
      fakeInitOptions({
        getCurrentDirectoryName: () => tmpDir,
        prompts: {
          promptForServerUrl: async () => FAKE_SERVER_URL,
          promptForHttpsRemote: async () => FAKE_HTTPS_REMOTE_URL,
        },
        presenter: { onServerRejectedRemoteUrl, onServerUnreachable },
      }),
    )

    expect(result).toBe('error')
    expect(onServerRejectedRemoteUrl).toHaveBeenCalledWith(
      FAKE_HTTPS_REMOTE_URL,
      expect.any(String),
    )
    expect(onServerUnreachable).not.toHaveBeenCalled()
  })

  it('reports a remote-url error, without prompting for the server URL, when the directory has no git remote', async () => {
    execFileSync('git', ['remote', 'remove', 'origin'], { cwd: tmpDir })
    const promptForServerUrl = vi.fn(async () => FAKE_SERVER_URL)
    const onRemoteUrlError = vi.fn()

    const result = await init(
      fakeInitOptions({
        getCurrentDirectoryName: () => tmpDir,
        prompts: { promptForServerUrl },
        presenter: { onRemoteUrlError },
      }),
    )

    expect(result).toBe('error')
    expect(onRemoteUrlError).toHaveBeenCalledWith(expect.any(String))
    expect(promptForServerUrl).not.toHaveBeenCalled()
  })

  it('uses the HTTPS-prompt answer as-is with no client-side re-validation, even if not HTTPS', async () => {
    const nonHttpsAnswer = 'still-not-https'
    stubRegisterProjectApi(
      201,
      { projectId: 'proj_abc123' },
      { name: basename(tmpDir), remoteUrl: nonHttpsAnswer },
    )
    const promptForHttpsRemote = vi.fn(async () => nonHttpsAnswer)

    const result = await init(
      fakeInitOptions({
        getCurrentDirectoryName: () => tmpDir,
        prompts: {
          promptForServerUrl: async () => FAKE_SERVER_URL,
          promptForHttpsRemote,
        },
        presenter: { onProjectRegistered: vi.fn() },
      }),
    )

    expect(result).toBe('success')
    expect(promptForHttpsRemote).toHaveBeenCalledTimes(1)
  })

  it('prompts for an HTTPS equivalent when the git remote is not HTTPS', async () => {
    stubRegisterProjectApi(
      201,
      { projectId: 'proj_abc123' },
      { name: basename(tmpDir), remoteUrl: FAKE_HTTPS_REMOTE_URL },
    )
    const promptForHttpsRemote = vi.fn(async () => FAKE_HTTPS_REMOTE_URL)

    const result = await init(
      fakeInitOptions({
        getCurrentDirectoryName: () => tmpDir,
        prompts: {
          promptForServerUrl: async () => FAKE_SERVER_URL,
          promptForHttpsRemote,
        },
        presenter: { onProjectRegistered: vi.fn() },
      }),
    )

    expect(result).toBe('success')
    expect(promptForHttpsRemote).toHaveBeenCalledWith(FAKE_REMOTE_URL)
    expect(readWrittenCache().projectId).toBe('proj_abc123')
  })

  it('does not prompt for an HTTPS equivalent when the git remote is already HTTPS', async () => {
    execFileSync('git', ['remote', 'set-url', 'origin', FAKE_HTTPS_REMOTE_URL], { cwd: tmpDir })
    stubRegisterProjectApi(
      201,
      { projectId: 'proj_abc123' },
      { name: basename(tmpDir), remoteUrl: FAKE_HTTPS_REMOTE_URL },
    )

    const result = await init(
      fakeInitOptions({
        getCurrentDirectoryName: () => tmpDir,
        prompts: { promptForServerUrl: async () => FAKE_SERVER_URL },
        presenter: { onProjectRegistered: vi.fn() },
      }),
    )

    expect(result).toBe('success')
  })

  it('reuses an existing serverUrl from .ripe/settings.json without prompting when the user confirms keeping it', async () => {
    writeExistingSettings(JSON.stringify({ serverUrl: FAKE_SERVER_URL }))
    stubRegisterProjectApi(
      201,
      { projectId: 'proj_abc123' },
      { name: basename(tmpDir), remoteUrl: FAKE_HTTPS_REMOTE_URL },
    )
    const promptForServerUrl = vi.fn(async () => 'https://should-not-be-used')

    const result = await init(
      fakeInitOptions({
        getCurrentDirectoryName: () => tmpDir,
        prompts: {
          promptForServerUrl,
          promptForHttpsRemote: async () => FAKE_HTTPS_REMOTE_URL,
          promptToConfirmServerUrl: async () => true,
        },
        presenter: { onProjectRegistered: vi.fn() },
      }),
    )

    expect(result).toBe('success')
    expect(promptForServerUrl).not.toHaveBeenCalled()
    expect(readWrittenSettings().serverUrl).toBe(FAKE_SERVER_URL)
    expect(readWrittenCache().projectId).toBe('proj_abc123')
  })

  it('prompts for and uses a new server URL when the user declines to reuse the existing one', async () => {
    writeExistingSettings(JSON.stringify({ serverUrl: FAKE_SERVER_URL }))
    const newServerUrl = 'https://a-new-server-url'
    nock(newServerUrl).post('/api/projects').reply(201, { projectId: 'proj_abc123' })

    const result = await init(
      fakeInitOptions({
        getCurrentDirectoryName: () => tmpDir,
        prompts: {
          promptForServerUrl: async () => newServerUrl,
          promptForHttpsRemote: async () => FAKE_HTTPS_REMOTE_URL,
          promptToConfirmServerUrl: async () => false,
        },
        presenter: { onProjectRegistered: vi.fn() },
      }),
    )

    expect(result).toBe('success')
    expect(readWrittenSettings().serverUrl).toBe(newServerUrl)
  })

  it('never asks the user to reuse an existing server URL when no .ripe/settings.json exists yet', async () => {
    stubRegisterProjectApi(
      201,
      { projectId: 'proj_abc123' },
      { name: basename(tmpDir), remoteUrl: FAKE_HTTPS_REMOTE_URL },
    )
    const promptToConfirmServerUrl = vi.fn(async () => true)

    const result = await init(
      fakeInitOptions({
        getCurrentDirectoryName: () => tmpDir,
        prompts: {
          promptForServerUrl: async () => FAKE_SERVER_URL,
          promptForHttpsRemote: async () => FAKE_HTTPS_REMOTE_URL,
          promptToConfirmServerUrl,
        },
        presenter: { onProjectRegistered: vi.fn() },
      }),
    )

    expect(result).toBe('success')
    expect(promptToConfirmServerUrl).not.toHaveBeenCalled()
  })

  function writeExistingSettings(content: string): void {
    mkdirSync(join(tmpDir, '.ripe'), { recursive: true })
    writeFileSync(join(tmpDir, '.ripe/settings.json'), content)
  }

  function readWrittenSettings(): RipeSettings {
    return JSON.parse(readFileSync(join(tmpDir, '.ripe/settings.json'), 'utf-8')) as RipeSettings
  }

  function readWrittenCache(): RipeCache {
    return JSON.parse(readFileSync(join(tmpDir, '.ripe/cache.json'), 'utf-8')) as RipeCache
  }
})

function unexpectedCall(name: string): (...args: unknown[]) => never {
  return (...args: unknown[]) => {
    throw new Error(`${name} should not have been called, but was called with: ${String(args)}`)
  }
}

function fakeInitOptions(overrides: {
  getCurrentDirectoryName?: () => string
  prompts?: Partial<InitPrompter>
  presenter?: Partial<InitPresenter>
}): InitOptions {
  return {
    getCurrentDirectoryName:
      overrides.getCurrentDirectoryName ?? unexpectedCall('getCurrentDirectoryName'),
    prompter: {
      promptForServerUrl: unexpectedCall('promptForServerUrl'),
      promptAnotherServerUrl: unexpectedCall('promptAnotherServerUrl'),
      promptToConfirmServerUrl: unexpectedCall('promptToConfirmServerUrl'),
      promptForHttpsRemote: unexpectedCall('promptForHttpsRemote'),
      ...overrides.prompts,
    },
    presenter: {
      onInvalidServerUrl: unexpectedCall('onInvalidServerUrl'),
      onProjectRegistered: unexpectedCall('onProjectRegistered'),
      onRemoteUrlError: unexpectedCall('onRemoteUrlError'),
      onServerRejectedRemoteUrl: unexpectedCall('onServerRejectedRemoteUrl'),
      onServerUnreachable: unexpectedCall('onServerUnreachable'),
      onLocalStateWriteFailed: unexpectedCall('onLocalStateWriteFailed'),
      ...overrides.presenter,
    },
  }
}

function stubRegisterProjectApi(
  status: number,
  body: RegisterProjectResponseBody,
  requestBody?: RegisterProjectRequestBody,
): void {
  nock(FAKE_SERVER_URL)
    .post('/api/projects', requestBody as nock.RequestBodyMatcher | undefined)
    .reply(status, body)
}
