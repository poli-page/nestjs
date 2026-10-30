import type { Provider } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'

/** The `APP_FILTER` providers of a dynamic module. */
export function appFilters(providers: readonly Provider[] | undefined): Provider[] {
  return (providers ?? []).filter(
    (p) => typeof p === 'object' && 'provide' in p && p.provide === APP_FILTER,
  )
}
