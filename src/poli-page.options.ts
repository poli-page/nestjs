import type { ModuleMetadata, Type } from '@nestjs/common'
import type {
  PoliPageError,
  RequestEvent,
  ResponseEvent,
  RetryEvent,
} from '@poli-page/sdk'

export interface PoliPageModuleOptions {
  apiKey: string
  baseUrl?: string
  timeout?: number
  maxRetries?: number
  retryDelay?: number
  onRequest?: (e: RequestEvent) => void
  onResponse?: (e: ResponseEvent) => void
  onRetry?: (e: RetryEvent) => void
  onError?: (err: PoliPageError) => void
  /**
   * Register `PoliPageExceptionFilter` as a global filter via `APP_FILTER`, so a
   * `PoliPageError` answers its `toPayload()` body. Default `true`; `false` turns it off.
   */
  registerGlobalExceptionFilter?: boolean
}

export interface PoliPageOptionsFactory {
  createPoliPageOptions(): Promise<PoliPageModuleOptions> | PoliPageModuleOptions
}

export interface PoliPageModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (...args: any[]) => Promise<PoliPageModuleOptions> | PoliPageModuleOptions
  useClass?: Type<PoliPageOptionsFactory>
  useExisting?: Type<PoliPageOptionsFactory>
  inject?: Array<Type<any> | string | symbol>
  /**
   * Register `PoliPageExceptionFilter` as a global filter via `APP_FILTER`. Default `true`;
   * `false` turns it off. Read at registration time, before `useFactory` runs.
   */
  registerGlobalExceptionFilter?: boolean
}
