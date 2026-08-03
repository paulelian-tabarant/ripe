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
import { init } from '@/commands/init.js'

const FAKE_SERVER_URL = 'https://fake-server-url'
const FAKE_REMOTE_URL = 'git@github.com:acme/widgets.git'
const FAKE_HTTPS_REMOTE_URL = 'https://github.com/acme/widgets'

interface WrittenSettings {
  serverUrl: string
}

interface WrittenCache {
  projectId: string
}

describe('init', () => {
  let tmpDir: string
  let logSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'ripe-test-'))
    execFileSync('git', ['init'], { cwd: tmpDir })
    execFileSync('git', ['remote', 'add', 'origin', FAKE_REMOTE_URL], { cwd: tmpDir })
    nock.cleanAll()
    nock.disableNetConnect()
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
    nock.cleanAll()
    nock.enableNetConnect()
    logSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('creates .ripe/settings.json and .ripe/cache.json with serverUrl and projectId on 201', async () => {
    stubRegisterProjectApi(
      201,
      { projectId: 'proj_abc123' },
      { name: basename(tmpDir), remoteUrl: FAKE_HTTPS_REMOTE_URL },
    )

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn: async () => FAKE_SERVER_URL,
      httpsRemotePromptFn: async () => FAKE_HTTPS_REMOTE_URL,
    })

    expect(result.status).toBe('success')
    expect(readWrittenSettings().serverUrl).toBe(FAKE_SERVER_URL)
    expect(readWrittenCache().projectId).toBe('proj_abc123')
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Project registered: proj_abc123'))
  })

  it('writes settings and cache on 200 (existing project) with no confirmation prompt', async () => {
    stubRegisterProjectApi(200, { projectId: 'proj_existing' })

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn: async () => FAKE_SERVER_URL,
      httpsRemotePromptFn: async () => FAKE_HTTPS_REMOTE_URL,
    })

    expect(result.status).toBe('success')
    expect(readWrittenSettings().serverUrl).toBe(FAKE_SERVER_URL)
    expect(readWrittenCache().projectId).toBe('proj_existing')
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Using existing project ID: proj_existing'),
    )
  })

  it('re-prompts on invalid URL until a valid one is provided', async () => {
    stubRegisterProjectApi(201, { projectId: 'proj_abc123' })

    const urls = ['not-a-url', 'ftp://example.com', FAKE_SERVER_URL]
    let call = 0

    const result = await init({
      currentDirectoryName: tmpDir,
      httpsRemotePromptFn: async () => FAKE_HTTPS_REMOTE_URL,
      // biome-ignore lint/style/noNonNullAssertion: this is safe because the last URL is valid
      urlPromptFn: async () => urls[call++]!,
    })

    expect(result.status).toBe('success')
    expect(errorSpy).toHaveBeenCalledTimes(2)
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid server URL: "not-a-url"'),
    )
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid server URL: "ftp://example.com"'),
    )
  })

  it('exits 1 and prints to stderr when server is unreachable', async () => {
    nock(FAKE_SERVER_URL)
      .post('/api/projects')
      .replyWithError('connect ECONNREFUSED 127.0.0.1:3000')

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn: async () => FAKE_SERVER_URL,
      httpsRemotePromptFn: async () => FAKE_HTTPS_REMOTE_URL,
    })

    expect(result.status).toBe('error')
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(`could not reach server at ${FAKE_SERVER_URL}`),
    )
  })

  it('exits 1 and prints a rejected-remote message (not "unreachable") on a 400', async () => {
    stubRegisterProjectApi(400, {} as RegisterProjectResponseBody)

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn: async () => FAKE_SERVER_URL,
      httpsRemotePromptFn: async () => FAKE_HTTPS_REMOTE_URL,
    })

    expect(result.status).toBe('error')
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('rejected this remote URL'))
    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining('could not reach server'))
  })

  it('exits 1 and prints to stderr when the directory has no git remote, without prompting for the server URL', async () => {
    execFileSync('git', ['remote', 'remove', 'origin'], { cwd: tmpDir })

    const urlPromptFn = vi.fn(async () => FAKE_SERVER_URL)

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn,
    })

    expect(result.status).toBe('error')
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('could not determine the git remote URL'),
    )
    expect(urlPromptFn).not.toHaveBeenCalled()
  })

  it('uses the HTTPS-prompt answer as-is with no client-side re-validation, even if not HTTPS', async () => {
    const nonHttpsAnswer = 'still-not-https'
    stubRegisterProjectApi(
      201,
      { projectId: 'proj_abc123' },
      { name: basename(tmpDir), remoteUrl: nonHttpsAnswer },
    )

    const httpsRemotePromptFn = vi.fn(async () => nonHttpsAnswer)

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn: async () => FAKE_SERVER_URL,
      httpsRemotePromptFn,
    })

    expect(result.status).toBe('success')
    expect(httpsRemotePromptFn).toHaveBeenCalledTimes(1)
  })

  it('prompts for an HTTPS equivalent when the git remote is not HTTPS', async () => {
    stubRegisterProjectApi(
      201,
      { projectId: 'proj_abc123' },
      { name: basename(tmpDir), remoteUrl: FAKE_HTTPS_REMOTE_URL },
    )

    const httpsRemotePromptFn = vi.fn(async () => FAKE_HTTPS_REMOTE_URL)

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn: async () => FAKE_SERVER_URL,
      httpsRemotePromptFn,
    })

    expect(result.status).toBe('success')
    expect(httpsRemotePromptFn).toHaveBeenCalledWith(FAKE_REMOTE_URL)
    expect(readWrittenCache().projectId).toBe('proj_abc123')
  })

  it('does not prompt for an HTTPS equivalent when the git remote is already HTTPS', async () => {
    execFileSync('git', ['remote', 'set-url', 'origin', FAKE_HTTPS_REMOTE_URL], { cwd: tmpDir })

    stubRegisterProjectApi(
      201,
      { projectId: 'proj_abc123' },
      { name: basename(tmpDir), remoteUrl: FAKE_HTTPS_REMOTE_URL },
    )

    const httpsRemotePromptFn = vi.fn(async () => {
      throw new Error('should not be called')
    })

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn: async () => FAKE_SERVER_URL,
      httpsRemotePromptFn,
    })

    expect(result.status).toBe('success')
    expect(httpsRemotePromptFn).not.toHaveBeenCalled()
  })

  it('reuses an existing serverUrl from .ripe/settings.json without prompting when the user confirms keeping it', async () => {
    writeExistingSettings(JSON.stringify({ serverUrl: FAKE_SERVER_URL }))

    stubRegisterProjectApi(
      201,
      { projectId: 'proj_abc123' },
      { name: basename(tmpDir), remoteUrl: FAKE_HTTPS_REMOTE_URL },
    )

    const urlPromptFn = vi.fn(async () => 'https://should-not-be-used')

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn,
      httpsRemotePromptFn: async () => FAKE_HTTPS_REMOTE_URL,
      confirmServerUrlPromptFn: async () => true,
    })

    expect(result.status).toBe('success')
    expect(urlPromptFn).not.toHaveBeenCalled()
    expect(readWrittenSettings().serverUrl).toBe(FAKE_SERVER_URL)
    expect(readWrittenCache().projectId).toBe('proj_abc123')
  })

  it('falls through to the serverUrl prompt loop when the user declines the existing serverUrl', async () => {
    writeExistingSettings(JSON.stringify({ serverUrl: FAKE_SERVER_URL }))

    const newServerUrl = 'https://a-new-server-url'
    stubRegisterProjectApi(
      201,
      { projectId: 'proj_abc123' },
      { name: basename(tmpDir), remoteUrl: FAKE_HTTPS_REMOTE_URL },
    )
    nock(newServerUrl).post('/api/projects').reply(201, { projectId: 'proj_abc123' })

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn: async () => newServerUrl,
      httpsRemotePromptFn: async () => FAKE_HTTPS_REMOTE_URL,
      confirmServerUrlPromptFn: async () => false,
    })

    expect(result.status).toBe('success')
    expect(readWrittenSettings().serverUrl).toBe(newServerUrl)
  })

  it('never calls confirmServerUrlPromptFn when no .ripe/settings.json exists yet', async () => {
    stubRegisterProjectApi(
      201,
      { projectId: 'proj_abc123' },
      { name: basename(tmpDir), remoteUrl: FAKE_HTTPS_REMOTE_URL },
    )

    const confirmServerUrlPromptFn = vi.fn(async () => true)

    const result = await init({
      currentDirectoryName: tmpDir,
      urlPromptFn: async () => FAKE_SERVER_URL,
      httpsRemotePromptFn: async () => FAKE_HTTPS_REMOTE_URL,
      confirmServerUrlPromptFn,
    })

    expect(result.status).toBe('success')
    expect(confirmServerUrlPromptFn).not.toHaveBeenCalled()
  })

  function writeExistingSettings(content: string): void {
    mkdirSync(join(tmpDir, '.ripe'), { recursive: true })
    writeFileSync(join(tmpDir, '.ripe/settings.json'), content)
  }

  function readWrittenSettings(): WrittenSettings {
    return JSON.parse(readFileSync(join(tmpDir, '.ripe/settings.json'), 'utf-8')) as WrittenSettings
  }

  function readWrittenCache(): WrittenCache {
    return JSON.parse(readFileSync(join(tmpDir, '.ripe/cache.json'), 'utf-8')) as WrittenCache
  }
})

function stubRegisterProjectApi(
  status: number,
  body: RegisterProjectResponseBody,
  requestBody?: RegisterProjectRequestBody,
): void {
  nock(FAKE_SERVER_URL)
    .post('/api/projects', requestBody as nock.RequestBodyMatcher | undefined)
    .reply(status, body)
}
