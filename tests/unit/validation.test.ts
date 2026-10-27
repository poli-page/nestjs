import { afterEach, beforeEach, describe, it, expect, jest } from '@jest/globals'
import { Logger } from '@nestjs/common'
import { validatePoliPageOptions } from '../../src/validation'
import {
  LONGEST_SHOWN_ENV,
  MALFORMED_KEYS,
  SANDBOX_KEY,
  SECRET,
  UNSHOWN_ENV_KEYS,
  WELL_FORMED_KEYS,
} from './fixtures/api-keys'

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

  it('throws when apiKey is empty', () => {
    expect(() => validatePoliPageOptions({ apiKey: '' })).toThrow(/apiKey is required/)
    expect(warn).not.toHaveBeenCalled()
  })

  it.each(WELL_FORMED_KEYS)('accepts %s without a warning', (key) => {
    expect(() => validatePoliPageOptions({ apiKey: key })).not.toThrow()
    expect(warn).not.toHaveBeenCalled()
  })

  it.each(MALFORMED_KEYS)('accepts %s with one warning that hides the secret', (key) => {
    expect(() => validatePoliPageOptions({ apiKey: key })).not.toThrow()
    expect(warn).toHaveBeenCalledTimes(1)
    const message = String(warn.mock.calls[0]?.[0])
    expect(message).toMatch(/apiKey/)
    expect(message).not.toContain(key)
    expect(message).not.toContain(SECRET)
  })

  it.each([
    ['pp_sandbox_x', 'pp_sandbox_'],
    ['pp_eu-prod_x', 'pp_eu-prod_'],
    [`pp_${LONGEST_SHOWN_ENV}_x`, `pp_${LONGEST_SHOWN_ENV}_`],
  ])('names the pp_{env}_ part of %s in the warning', (key, prefix) => {
    validatePoliPageOptions({ apiKey: key })
    expect(String(warn.mock.calls[0]?.[0])).toContain(`(got ${prefix}…)`)
  })

  it.each(UNSHOWN_ENV_KEYS)('shows no key text for %s, whose env is outside the contract grammar', (key) => {
    validatePoliPageOptions({ apiKey: key })
    const message = String(warn.mock.calls[0]?.[0])
    const env = key.slice('pp_'.length, key.indexOf('_', 'pp_'.length))
    expect(message).toContain('(got a value without a pp_{env}_ prefix)')
    expect(message).not.toContain(env)
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
