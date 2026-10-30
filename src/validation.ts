import { Logger } from '@nestjs/common'
import type { PoliPageModuleOptions } from './poli-page.options'

// `pp_{env}_{32 hex}`, where `{env}` is lowercase, letter first, single inner
// hyphens, at most 20 characters.
const KEY_PATTERN = /^pp_(?=[a-z][a-z0-9-]{0,19}_)[a-z][a-z0-9]*(?:-[a-z0-9]+)*_[0-9a-f]{32}$/

const logger = new Logger('PoliPageModule')

export function validatePoliPageOptions(options: PoliPageModuleOptions): void {
  if (typeof options.apiKey !== 'string' || options.apiKey === '') {
    throw new Error('PoliPageModuleOptions.apiKey is required.')
  }
  // The API is the only authority on keys: a key of an unexpected shape is
  // reported once and sent anyway, so the API answers with its own error. The
  // warning shows no part of the key, not even a `pp_{env}_` prefix: a
  // mis-pasted secret fragment can look like an environment name.
  if (!KEY_PATTERN.test(options.apiKey)) {
    logger.warn(
      'PoliPageModuleOptions.apiKey does not match the expected format pp_{environment}_{32 lowercase hex characters}. ' +
        'Starting anyway; the Poli Page API decides whether the key is valid.',
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
