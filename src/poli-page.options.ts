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
  /** Register PoliPageExceptionFilter as a global filter via APP_FILTER. Default false. */
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
  registerGlobalExceptionFilter?: boolean
}
