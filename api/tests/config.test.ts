import { afterEach, describe, expect, it } from 'vitest'
import { loadConfig } from '../src/config.js'

describe('loadConfig', () => {
  afterEach(() => {
    delete process.env.DATABASE_PATH
    delete process.env.PORT
    delete process.env.SHOULD_SERVE_BUILT_FRONTEND
  })

  it('returns parsed config when all vars are valid', () => {
    process.env.DATABASE_PATH = '/tmp/test.db'
    process.env.PORT = '4000'

    expect(loadConfig()).toEqual({
      databasePath: '/tmp/test.db',
      port: 4000,
      shouldServeBuiltFrontend: false,
    })
  })

  it('returns shouldServeBuiltFrontend true when SHOULD_SERVE_BUILT_FRONTEND is "true"', () => {
    process.env.DATABASE_PATH = '/tmp/test.db'
    process.env.PORT = '4000'
    process.env.SHOULD_SERVE_BUILT_FRONTEND = 'true'

    expect(loadConfig().shouldServeBuiltFrontend).toBe(true)
  })

  it.each([
    ['PORT is not set', { DATABASE_PATH: '/tmp/test.db' }, 'PORT'],
    ['DATABASE_PATH is missing', {}, 'DATABASE_PATH'],
    ['PORT is not a number', { DATABASE_PATH: '/tmp/test.db', PORT: 'not-a-number' }, 'PORT'],
    ['PORT is out of range', { DATABASE_PATH: '/tmp/test.db', PORT: '99999' }, 'PORT'],
  ])('throws when %s', (_description, envOverrides, expectedMessage) => {
    Object.assign(process.env, envOverrides)

    expect(() => loadConfig()).toThrow(expectedMessage)
  })
})
