import { Logger } from '@nestjs/common'
import type { PoliPageModuleOptions } from './poli-page.options'

const KEY_PATTERN = /^pp_(?=[a-z][a-z0-9-]{0,19}_)[a-z][a-z0-9]*(?:-[a-z0-9]+)*_[0-9a-f]{32}$/
// At most the `pp_{env}_` part of a key may be logged: never the secret after it.
const ENV_PREFIX = /^pp_[^_]{1,20}_/

const logger = new Logger('PoliPageModule')

export function validatePoliPageOptions(options: PoliPageModuleOptions): void {
  if (typeof options.apiKey !== 'string' || options.apiKey === '') {
    throw new Error('PoliPageModuleOptions.apiKey is required.')
  }
  // The API is the only authority on keys: a key of an unexpected shape is
  // reported once and sent anyway, so the API answers with its own error.
  if (!KEY_PATTERN.test(options.apiKey)) {
    const prefix = ENV_PREFIX.exec(options.apiKey)?.[0]
    const shown = prefix === undefined ? 'a value without a pp_{env}_ prefix' : `${prefix}…`
    logger.warn(
      `PoliPageModuleOptions.apiKey does not match pp_{env}_{32 hex} (got ${shown}). ` +
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
