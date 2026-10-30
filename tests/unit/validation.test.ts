import { afterEach, beforeEach, describe, it, expect, jest } from '@jest/globals'
import { Logger } from '@nestjs/common'
import { validatePoliPageOptions } from '../../src/validation'
import { expectNoKeyText, MALFORMED_KEYS, SANDBOX_KEY, WELL_FORMED_KEYS } from './fixtures/api-keys'

describe('validatePoliPageOptions', () => {
  let warn: jest.SpiedFunction<Logger['warn']>

  beforeEach(() => {
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    warn.mockRestore()
  })

  it('accepts a minimal valid options object', () => {
    expect(() => validatePoliPageOptions({ apiKey: SANDBOX_KEY })).not.toThrow()
  })

  it('throws when apiKey is missing', () => {
    // @ts-expect-error testing runtime guard
    expect(() => validatePoliPageOptions({})).toThrow(/apiKey/)
  })

  it('throws when apiKey is empty, with a message that shows no key text', () => {
    expect(() => validatePoliPageOptions({ apiKey: '' }))
      .toThrow(/^PoliPageModuleOptions\.apiKey is required\.$/)
    expect(warn).not.toHaveBeenCalled()
  })

  it.each(WELL_FORMED_KEYS)('accepts %s without a warning', (key) => {
    expect(() => validatePoliPageOptions({ apiKey: key })).not.toThrow()
    expect(warn).not.toHaveBeenCalled()
  })

  it.each(MALFORMED_KEYS)('accepts %j with one warning that shows no key text', (key) => {
    expect(() => validatePoliPageOptions({ apiKey: key })).not.toThrow()
    expect(warn).toHaveBeenCalledTimes(1)
    const message = String(warn.mock.calls[0]?.[0])
    expect(message).toContain(
      'PoliPageModuleOptions.apiKey does not match the expected format pp_{environment}_{32 lowercase hex characters}.',
    )
    expectNoKeyText(message, key)
  })

  it.each([
    ['timeout', -1],
    ['timeout', 0],
    ['timeout', 600_001],
    ['maxRetries', -1],
    ['maxRetries', 11],
    ['retryDelay', -1],
    ['retryDelay', 30_001],
  ])('rejects out-of-range %s = %i', (field, value) => {
    expect(() => validatePoliPageOptions({ apiKey: SANDBOX_KEY, [field]: value }))
      .toThrow(new RegExp(field))
  })

  it('rejects non-http baseUrl', () => {
    expect(() => validatePoliPageOptions({ apiKey: SANDBOX_KEY, baseUrl: 'ftp://x' }))
      .toThrow(/baseUrl/)
  })

  it('accepts valid baseUrl', () => {
    expect(() => validatePoliPageOptions({
      apiKey: SANDBOX_KEY, baseUrl: 'https://api.example.com',
    })).not.toThrow()
  })
})
