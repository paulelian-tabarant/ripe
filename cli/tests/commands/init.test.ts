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
import { createCacheStore, type RipeCache } from '@/infrastructure/cache-store.js'
import { createGitRepository } from '@/infrastructure/git-repository.js'
import { createProjectDirectory } from '@/infrastructure/project-directory.js'
import { createSettingsStore, type RipeSettings } from '@/infrastructure/settings-store.js'

const FAKE_SERVER_URL = 'https://fake-server-url'
const FAKE_REMOTE_URL = 'git@github.com:acme/widgets.git'
const FAKE_HTTPS_REMOTE_URL = 'https://github.com/acme/widgets'

describe('init', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'ripe-test-'))
    execFileSync('git', ['init', '-b', 'main'], { cwd: tmpDir })
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: tmpDir })
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: tmpDir })
    commitOnMain(tmpDir, 'chore: initial commit')
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
    const onProjectCreated = vi.fn()

    const result = await init(
      fakeInitOptions({
        getCurrentDirectoryName: () => tmpDir,
        prompts: {
          promptForServerUrl: async () => FAKE_SERVER_URL,
          promptForHttpsRemote: async () => FAKE_HTTPS_REMOTE_URL,
        },
        presenter: { onProjectCreated },
      }),
    )

    expect(result).toBe('success')
    expect(readWrittenSettings().serverUrl).toBe(FAKE_SERVER_URL)
    expect(readWrittenCache().projectId).toBe('proj_abc123')
    expect(onProjectCreated).toHaveBeenCalledWith('proj_abc123')
  })

  it('reports a retryable error, without crashing, when saving local state fails after a successful registration', async () => {
    stubRegisterProjectApi(
      201,
      { projectId: 'proj_abc123' },
      { name: basename(tmpDir), remoteUrl: FAKE_HTTPS_REMOTE_URL },
    )
    const onLocalStateWriteFailed = vi.fn()
    const options = fakeInitOptions({
      getCurrentDirectoryName: () => tmpDir,
      prompts: {
        promptForServerUrl: async () => FAKE_SERVER_URL,
        promptForHttpsRemote: async () => FAKE_HTTPS_REMOTE_URL,
      },
      presenter: { onProjectCreated: vi.fn(), onLocalStateWriteFailed },
    })
    vi.spyOn(options.cacheStore, 'write').mockImplementation(() => {
      throw new Error('ENOSPC: no space left on device')
    })

    const result = await init(options)

    expect(result).toBe('error')
    expect(onLocalStateWriteFailed).toHaveBeenCalledWith(
      expect.stringContaining('ENOSPC: no space left on device'),
    )
  })

  it('writes settings and cache on 200 (existing project) with no confirmation prompt', async () => {
    stubRegisterProjectApi(200, { projectId: 'proj_existing' })
    const onProjectAlreadyExisting = vi.fn()

    const result = await init(
      fakeInitOptions({
        getCurrentDirectoryName: () => tmpDir,
        prompts: {
          promptForServerUrl: async () => FAKE_SERVER_URL,
          promptForHttpsRemote: async () => FAKE_HTTPS_REMOTE_URL,
        },
        presenter: { onProjectAlreadyExisting },
      }),
    )

    expect(result).toBe('success')
    expect(readWrittenSettings().serverUrl).toBe(FAKE_SERVER_URL)
    expect(readWrittenCache().projectId).toBe('proj_existing')
    expect(onProjectAlreadyExisting).toHaveBeenCalledWith('proj_existing')
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
        presenter: { onInvalidServerUrl, onProjectCreated: vi.fn() },
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
        presenter: { onProjectCreated: vi.fn() },
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
        presenter: { onProjectCreated: vi.fn() },
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
        presenter: { onProjectCreated: vi.fn() },
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
        presenter: { onProjectCreated: vi.fn() },
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
        presenter: { onProjectCreated: vi.fn() },
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
        presenter: { onProjectCreated: vi.fn() },
      }),
    )

    expect(result).toBe('success')
    expect(promptToConfirmServerUrl).not.toHaveBeenCalled()
  })

  describe('skill registration', () => {
    it('POSTs the full scanned skill catalog and caches the returned skillIds when the cache is empty', async () => {
      writeSkillFileAndCommit(tmpDir, 'alpha', skillMd('alpha'))
      writeSkillFileAndCommit(tmpDir, 'beta', skillMd('beta'))
      stubRegisterProjectApi(201, { projectId: 'proj_abc123' })
      stubRegisterSkillsApi(
        'proj_abc123',
        200,
        [
          { name: 'alpha', skillId: 'skill_1' },
          { name: 'beta', skillId: 'skill_2' },
        ],
        ['alpha', 'beta'],
      )

      const result = await init(
        fakeInitOptions({
          getCurrentDirectoryName: () => tmpDir,
          prompts: {
            promptForServerUrl: async () => FAKE_SERVER_URL,
            promptForHttpsRemote: async () => FAKE_HTTPS_REMOTE_URL,
          },
          presenter: { onProjectCreated: vi.fn() },
        }),
      )

      expect(result).toBe('success')
      expect(readWrittenCache().skillIds).toEqual({ alpha: 'skill_1', beta: 'skill_2' })
    })

    it('re-registers an unchanged skill catalog and overwrites the cache, even when it already matches', async () => {
      writeSkillFileAndCommit(tmpDir, 'alpha', skillMd('alpha'))
      writeExistingCache({ projectId: 'proj_abc123', skillIds: { alpha: 'skill_1' } })
      stubRegisterProjectApi(200, { projectId: 'proj_abc123' })
      stubRegisterSkillsApi('proj_abc123', 200, [{ name: 'alpha', skillId: 'skill_1' }], ['alpha'])

      const result = await init(
        fakeInitOptions({
          getCurrentDirectoryName: () => tmpDir,
          prompts: {
            promptForServerUrl: async () => FAKE_SERVER_URL,
            promptForHttpsRemote: async () => FAKE_HTTPS_REMOTE_URL,
          },
          presenter: { onProjectAlreadyExisting: vi.fn() },
        }),
      )

      expect(result).toBe('success')
      expect(readWrittenCache().skillIds).toEqual({ alpha: 'skill_1' })
    })

    it('re-POSTs the full catalog and overwrites the cache when the scanned names no longer match a non-empty cache', async () => {
      writeSkillFileAndCommit(tmpDir, 'alpha', skillMd('alpha'))
      writeSkillFileAndCommit(tmpDir, 'beta', skillMd('beta'))
      writeExistingCache({ projectId: 'proj_abc123', skillIds: { alpha: 'skill_1' } })
      stubRegisterProjectApi(200, { projectId: 'proj_abc123' })
      stubRegisterSkillsApi(
        'proj_abc123',
        200,
        [
          { name: 'alpha', skillId: 'skill_1' },
          { name: 'beta', skillId: 'skill_2' },
        ],
        ['alpha', 'beta'],
      )

      const result = await init(
        fakeInitOptions({
          getCurrentDirectoryName: () => tmpDir,
          prompts: {
            promptForServerUrl: async () => FAKE_SERVER_URL,
            promptForHttpsRemote: async () => FAKE_HTTPS_REMOTE_URL,
          },
          presenter: { onProjectAlreadyExisting: vi.fn() },
        }),
      )

      expect(result).toBe('success')
      expect(readWrittenCache().skillIds).toEqual({ alpha: 'skill_1', beta: 'skill_2' })
    })

    it('warns and makes no skill registration call when no skills are found on main', async () => {
      stubRegisterProjectApi(201, { projectId: 'proj_abc123' })
      const onNoSkillsFound = vi.fn()

      const result = await init(
        fakeInitOptions({
          getCurrentDirectoryName: () => tmpDir,
          prompts: {
            promptForServerUrl: async () => FAKE_SERVER_URL,
            promptForHttpsRemote: async () => FAKE_HTTPS_REMOTE_URL,
          },
          presenter: { onProjectCreated: vi.fn(), onNoSkillsFound },
        }),
      )

      expect(result).toBe('success')
      expect(onNoSkillsFound).toHaveBeenCalled()
      expect(readWrittenCache().skillIds).toBeUndefined()
    })

    it.each([
      ['a namespaced name', skillMd('team:alpha'), 'namespaced'],
      ['malformed frontmatter', 'no frontmatter here\n', 'malformed-frontmatter'],
    ] as const)(
      'excludes a skill from registration and warns when it has %s',
      async (_description, content, expectedReason) => {
        writeSkillFileAndCommit(tmpDir, 'skipped-skill', content)
        stubRegisterProjectApi(201, { projectId: 'proj_abc123' })
        const onSkillSkipped = vi.fn()
        const onNoSkillsFound = vi.fn()

        const result = await init(
          fakeInitOptions({
            getCurrentDirectoryName: () => tmpDir,
            prompts: {
              promptForServerUrl: async () => FAKE_SERVER_URL,
              promptForHttpsRemote: async () => FAKE_HTTPS_REMOTE_URL,
            },
            presenter: { onProjectCreated: vi.fn(), onSkillSkipped, onNoSkillsFound },
          }),
        )

        expect(result).toBe('success')
        expect(onSkillSkipped).toHaveBeenCalledWith(
          expect.stringContaining('skipped-skill/SKILL.md'),
          expectedReason,
        )
        expect(onNoSkillsFound).toHaveBeenCalled()
        expect(readWrittenCache().skillIds).toBeUndefined()
      },
    )

    it('excludes a skill only committed on a feature branch, without any warning', async () => {
      execFileSync('git', ['checkout', '-b', 'feature'], { cwd: tmpDir })
      writeSkillFileAndCommit(tmpDir, 'feature-only', skillMd('feature-only'))
      execFileSync('git', ['checkout', 'main'], { cwd: tmpDir })
      stubRegisterProjectApi(201, { projectId: 'proj_abc123' })
      const onNoSkillsFound = vi.fn()

      const result = await init(
        fakeInitOptions({
          getCurrentDirectoryName: () => tmpDir,
          prompts: {
            promptForServerUrl: async () => FAKE_SERVER_URL,
            promptForHttpsRemote: async () => FAKE_HTTPS_REMOTE_URL,
          },
          presenter: { onProjectCreated: vi.fn(), onNoSkillsFound },
        }),
      )

      expect(result).toBe('success')
      expect(onNoSkillsFound).toHaveBeenCalled()
    })

    it('excludes an uncommitted skill, without any warning', async () => {
      const skillDir = join(tmpDir, '.claude/skills/uncommitted')
      mkdirSync(skillDir, { recursive: true })
      writeFileSync(join(skillDir, 'SKILL.md'), skillMd('uncommitted'))
      stubRegisterProjectApi(201, { projectId: 'proj_abc123' })
      const onNoSkillsFound = vi.fn()

      const result = await init(
        fakeInitOptions({
          getCurrentDirectoryName: () => tmpDir,
          prompts: {
            promptForServerUrl: async () => FAKE_SERVER_URL,
            promptForHttpsRemote: async () => FAKE_HTTPS_REMOTE_URL,
          },
          presenter: { onProjectCreated: vi.fn(), onNoSkillsFound },
        }),
      )

      expect(result).toBe('success')
      expect(onNoSkillsFound).toHaveBeenCalled()
    })

    it('fails with an error and makes no skill registration call when no local main branch exists', async () => {
      execFileSync('git', ['checkout', '-b', 'feature'], { cwd: tmpDir })
      execFileSync('git', ['branch', '-D', 'main'], { cwd: tmpDir })
      stubRegisterProjectApi(201, { projectId: 'proj_abc123' })
      const onNoLocalMainBranch = vi.fn()

      const result = await init(
        fakeInitOptions({
          getCurrentDirectoryName: () => tmpDir,
          prompts: {
            promptForServerUrl: async () => FAKE_SERVER_URL,
            promptForHttpsRemote: async () => FAKE_HTTPS_REMOTE_URL,
          },
          presenter: { onProjectCreated: vi.fn(), onNoLocalMainBranch },
        }),
      )

      expect(result).toBe('error')
      expect(onNoLocalMainBranch).toHaveBeenCalled()
      expect(nock.pendingMocks()).toEqual([])
    })
  })

  function writeExistingCache(cache: RipeCache): void {
    mkdirSync(join(tmpDir, '.ripe'), { recursive: true })
    writeFileSync(join(tmpDir, '.ripe/cache.json'), JSON.stringify(cache))
  }

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
  const getCurrentDirectoryName =
    overrides.getCurrentDirectoryName ?? unexpectedCall('getCurrentDirectoryName')
  const projectDirectory = createProjectDirectory(getCurrentDirectoryName)

  return {
    projectDirectory,
    prompter: {
      promptForServerUrl: unexpectedCall('promptForServerUrl'),
      promptAnotherServerUrl: unexpectedCall('promptAnotherServerUrl'),
      promptToConfirmServerUrl: unexpectedCall('promptToConfirmServerUrl'),
      promptForHttpsRemote: unexpectedCall('promptForHttpsRemote'),
      ...overrides.prompts,
    },
    presenter: {
      onInvalidServerUrl: unexpectedCall('onInvalidServerUrl'),
      onProjectCreated: unexpectedCall('onProjectCreated'),
      onProjectAlreadyExisting: unexpectedCall('onProjectAlreadyExisting'),
      onRemoteUrlError: unexpectedCall('onRemoteUrlError'),
      onServerRejectedRemoteUrl: unexpectedCall('onServerRejectedRemoteUrl'),
      onServerUnreachable: unexpectedCall('onServerUnreachable'),
      onLocalStateWriteFailed: unexpectedCall('onLocalStateWriteFailed'),
      onNoLocalMainBranch: unexpectedCall('onNoLocalMainBranch'),
      onNoSkillsFound: (): void => {},
      onSkillSkipped: unexpectedCall('onSkillSkipped'),
      onSkillRegistrationFailed: unexpectedCall('onSkillRegistrationFailed'),
      ...overrides.presenter,
    },
    gitRepository: createGitRepository(projectDirectory),
    settingsStore: createSettingsStore(projectDirectory),
    cacheStore: createCacheStore(projectDirectory),
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

function commitOnMain(cwd: string, message: string): void {
  execFileSync('git', ['commit', '--allow-empty', '-m', message], { cwd })
}

function writeSkillFileAndCommit(cwd: string, skillDirName: string, skillMdContent: string): void {
  const skillDir = join(cwd, '.claude/skills', skillDirName)
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(join(skillDir, 'SKILL.md'), skillMdContent)
  execFileSync('git', ['add', '.'], { cwd })
  commitOnMain(cwd, `feat: add ${skillDirName} skill`)
}

function skillMd(name: string): string {
  return `---\nname: ${name}\ndescription: a test skill\n---\n\nBody content.\n`
}

function stubRegisterSkillsApi(
  projectId: string,
  status: number,
  body: Array<{ name: string; skillId: string }>,
  expectedNames?: string[],
): void {
  nock(FAKE_SERVER_URL)
    .post(
      `/api/projects/${projectId}/skills`,
      (requestBody: { skills: Array<{ name: string }> }) => {
        if (!expectedNames) return true

        const names = requestBody.skills.map((skill) => skill.name)

        return (
          names.length === expectedNames.length &&
          expectedNames.every((name) => names.includes(name))
        )
      },
    )
    .reply(status, body)
}
