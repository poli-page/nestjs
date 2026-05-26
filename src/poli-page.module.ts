import { Module, Global, type DynamicModule, type Provider } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import { PoliPage, type PoliPageOptions } from '@poli-page/sdk'
import { PoliPageService } from './poli-page.service'
import { PoliPageExceptionFilter } from './poli-page-exception.filter'
import { POLI_PAGE_CLIENT_TOKEN, POLI_PAGE_OPTIONS_TOKEN } from './poli-page.tokens'
import type { PoliPageModuleOptions } from './poli-page.options'
import { validatePoliPageOptions } from './validation'

@Global()
@Module({})
export class PoliPageModule {
  static forRoot(options: PoliPageModuleOptions): DynamicModule {
    validatePoliPageOptions(options)

    const optionsProvider: Provider = {
      provide: POLI_PAGE_OPTIONS_TOKEN,
      useValue: options,
    }

    const clientProvider: Provider = {
      provide: POLI_PAGE_CLIENT_TOKEN,
      useFactory: (opts: PoliPageModuleOptions): PoliPage => buildClient(opts),
      inject: [POLI_PAGE_OPTIONS_TOKEN],
    }

    const filterProviders: Provider[] = options.registerGlobalExceptionFilter
      ? [{ provide: APP_FILTER, useClass: PoliPageExceptionFilter }]
      : []

    return {
      module: PoliPageModule,
      global: true,
      providers: [optionsProvider, clientProvider, PoliPageService, ...filterProviders],
      exports: [POLI_PAGE_CLIENT_TOKEN, PoliPageService],
    }
  }
}

export function buildClient(opts: PoliPageModuleOptions): PoliPage {
  const config: PoliPageOptions = { apiKey: opts.apiKey }
  if (opts.baseUrl !== undefined) config.baseUrl = opts.baseUrl
  if (opts.timeout !== undefined) config.timeout = opts.timeout
  if (opts.maxRetries !== undefined) config.maxRetries = opts.maxRetries
  if (opts.retryDelay !== undefined) config.retryDelay = opts.retryDelay
  if (opts.onRequest !== undefined) config.onRequest = opts.onRequest
  if (opts.onResponse !== undefined) config.onResponse = opts.onResponse
  if (opts.onRetry !== undefined) config.onRetry = opts.onRetry
  if (opts.onError !== undefined) config.onError = opts.onError
  return new PoliPage(config)
}
