import type { PoliPageModuleOptions } from './poli-page.options'

const KEY_PATTERN = /^pp_(test|live)_/

export function validatePoliPageOptions(options: PoliPageModuleOptions): void {
  if (typeof options.apiKey !== 'string') {
    throw new Error('PoliPageModuleOptions.apiKey is required.')
  }
  if (!KEY_PATTERN.test(options.apiKey)) {
    const prefix = options.apiKey.slice(0, 8)
    throw new Error(
      `PoliPageModuleOptions.apiKey must start with pp_test_ or pp_live_. Got: ${prefix}…`,
    )
  }
  if (options.timeout !== undefined) {
    if (typeof options.timeout !== 'number' || options.timeout <= 0 || options.timeout > 600_000) {
      throw new Error('PoliPageModuleOptions.timeout must be a number in (0, 600_000] ms.')
    }
  }
  if (options.maxRetries !== undefined) {
    if (!Number.isInteger(options.maxRetries) || options.maxRetries < 0 || options.maxRetries > 10) {
      throw new Error('PoliPageModuleOptions.maxRetries must be an integer in [0, 10].')
    }
  }
  if (options.retryDelay !== undefined) {
    if (typeof options.retryDelay !== 'number' || options.retryDelay < 0 || options.retryDelay > 30_000) {
      throw new Error('PoliPageModuleOptions.retryDelay must be a number in [0, 30_000] ms.')
    }
  }
  if (options.baseUrl !== undefined) {
    try {
      const url = new URL(options.baseUrl)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('non-http')
      }
    } catch {
      throw new Error('PoliPageModuleOptions.baseUrl must be a valid http(s) URL.')
    }
  }
}
