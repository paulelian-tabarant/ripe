import { afterEach, describe, expect, it } from 'vitest'
import { loadConfig } from '../src/config.js'

describe('loadConfig', () => {
  afterEach(() => {
    delete process.env.DATABASE_PATH
    delete process.env.PORT
  })

  it('returns parsed config when all vars are valid', () => {
    process.env.DATABASE_PATH = '/tmp/test.db'
    process.env.PORT = '4000'

    expect(loadConfig()).toEqual({ databasePath: '/tmp/test.db', port: 4000 })
  })

  it('throws when PORT is not set', () => {
    process.env.DATABASE_PATH = '/tmp/test.db'

    expect(() => loadConfig()).toThrow('PORT')
  })

  it('throws when DATABASE_PATH is missing', () => {
    expect(() => loadConfig()).toThrow('DATABASE_PATH')
  })

  it('throws when PORT is not a number', () => {
    process.env.DATABASE_PATH = '/tmp/test.db'
    process.env.PORT = 'not-a-number'

    expect(() => loadConfig()).toThrow('PORT')
  })

  it('throws when PORT is out of range', () => {
    process.env.DATABASE_PATH = '/tmp/test.db'
    process.env.PORT = '99999'

    expect(() => loadConfig()).toThrow('PORT')
  })
})
