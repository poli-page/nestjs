import { describe, it, expect } from '@jest/globals'
import { validatePoliPageOptions } from '../../src/validation'

describe('validatePoliPageOptions', () => {
  it('accepts a minimal valid options object', () => {
    expect(() => validatePoliPageOptions({ apiKey: 'pp_test_abc' })).not.toThrow()
  })

  it('throws when apiKey is missing', () => {
    // @ts-expect-error testing runtime guard
    expect(() => validatePoliPageOptions({})).toThrow(/apiKey/)
  })

  it.each([
    'abcdef', 'sk_test_abc', 'pp_abc', 'pp_prod_abc', '',
  ])('throws on bad apiKey prefix: %s', (key) => {
    expect(() => validatePoliPageOptions({ apiKey: key }))
      .toThrow(/pp_test_|pp_live_/)
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
    expect(() => validatePoliPageOptions({ apiKey: 'pp_test_x', [field]: value }))
      .toThrow(new RegExp(field))
  })

  it('rejects non-http baseUrl', () => {
    expect(() => validatePoliPageOptions({ apiKey: 'pp_test_x', baseUrl: 'ftp://x' }))
      .toThrow(/baseUrl/)
  })

  it('accepts valid baseUrl', () => {
    expect(() => validatePoliPageOptions({
      apiKey: 'pp_test_x', baseUrl: 'https://api.example.com',
    })).not.toThrow()
  })
})
