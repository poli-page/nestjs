import { afterEach, describe, it, expect, jest } from '@jest/globals'
import { Test, type TestingModule } from '@nestjs/testing'
import { Injectable, Logger, Module } from '@nestjs/common'
import { PoliPage } from '@poli-page/sdk'
import { PoliPageModule } from '../../src/poli-page.module'
import { POLI_PAGE_CLIENT_TOKEN } from '../../src/poli-page.tokens'
import type { PoliPageOptionsFactory, PoliPageModuleOptions } from '../../src/poli-page.options'
import { MALFORMED_KEYS, SANDBOX_KEY, SECRET, WELL_FORMED_KEYS } from './fixtures/api-keys'

describe('PoliPageModule.forRootAsync', () => {
  let moduleRef: TestingModule | undefined

  afterEach(async () => {
    await moduleRef?.close()
    moduleRef = undefined
    jest.restoreAllMocks()
  })

  it('resolves with useFactory + no inject', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        PoliPageModule.forRootAsync({
          useFactory: () => ({ apiKey: SANDBOX_KEY }),
        }),
      ],
    }).compile()

    expect(moduleRef.get(POLI_PAGE_CLIENT_TOKEN)).toBeInstanceOf(PoliPage)
  })

  it('resolves with useFactory + inject', async () => {
    @Injectable()
    class ConfigStub {
      get apiKey(): string { return SANDBOX_KEY }
    }

    @Module({ providers: [ConfigStub], exports: [ConfigStub] })
    class ConfigModuleStub {}

    moduleRef = await Test.createTestingModule({
      imports: [
        PoliPageModule.forRootAsync({
          imports: [ConfigModuleStub],
          inject: [ConfigStub],
          useFactory: (cfg: ConfigStub) => ({ apiKey: cfg.apiKey }),
        }),
      ],
    }).compile()

    expect(moduleRef.get(POLI_PAGE_CLIENT_TOKEN)).toBeInstanceOf(PoliPage)
  })

  it('resolves with useClass', async () => {
    @Injectable()
    class FactoryClass implements PoliPageOptionsFactory {
      createPoliPageOptions(): PoliPageModuleOptions {
        return { apiKey: SANDBOX_KEY }
      }
    }

    moduleRef = await Test.createTestingModule({
      imports: [PoliPageModule.forRootAsync({ useClass: FactoryClass })],
    }).compile()

    expect(moduleRef.get(POLI_PAGE_CLIENT_TOKEN)).toBeInstanceOf(PoliPage)
  })

  it('resolves with useExisting', async () => {
    @Injectable()
    class FactoryClass implements PoliPageOptionsFactory {
      createPoliPageOptions(): PoliPageModuleOptions {
        return { apiKey: SANDBOX_KEY }
      }
    }

    @Module({ providers: [FactoryClass], exports: [FactoryClass] })
    class FactoryModule {}

    moduleRef = await Test.createTestingModule({
      imports: [
        FactoryModule,
        PoliPageModule.forRootAsync({
          imports: [FactoryModule],
          useExisting: FactoryClass,
        }),
      ],
    }).compile()

    expect(moduleRef.get(POLI_PAGE_CLIENT_TOKEN)).toBeInstanceOf(PoliPage)
  })

  it('validates resolved options at compile time', async () => {
    const promise = Test.createTestingModule({
      imports: [
        PoliPageModule.forRootAsync({
          useFactory: () => ({ apiKey: '' }),
        }),
      ],
    }).compile()

    await expect(promise).rejects.toThrow(/apiKey/)
  })

  it.each(WELL_FORMED_KEYS)('boots with %s and no warning', async (key) => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)

    moduleRef = await Test.createTestingModule({
      imports: [PoliPageModule.forRootAsync({ useFactory: () => ({ apiKey: key }) })],
    }).compile()

    expect(moduleRef.get(POLI_PAGE_CLIENT_TOKEN)).toBeInstanceOf(PoliPage)
    expect(warn).not.toHaveBeenCalled()
  })

  it.each(MALFORMED_KEYS)('boots with %s and exactly one warning that hides the secret', async (key) => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)

    moduleRef = await Test.createTestingModule({
      imports: [PoliPageModule.forRootAsync({ useFactory: () => ({ apiKey: key }) })],
    }).compile()

    expect(moduleRef.get(POLI_PAGE_CLIENT_TOKEN)).toBeInstanceOf(PoliPage)
    expect(warn).toHaveBeenCalledTimes(1)
    const message = String(warn.mock.calls[0]?.[0])
    expect(message).not.toContain(key)
    expect(message).not.toContain(SECRET)
  })

  it('supports async useFactory (Promise return)', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        PoliPageModule.forRootAsync({
          useFactory: async () => {
            await new Promise(r => setTimeout(r, 1))
            return { apiKey: SANDBOX_KEY }
          },
        }),
      ],
    }).compile()

    expect(moduleRef.get(POLI_PAGE_CLIENT_TOKEN)).toBeInstanceOf(PoliPage)
  })

  it('registers global filter when registerGlobalExceptionFilter:true', () => {
    const dyn = PoliPageModule.forRootAsync({
      useFactory: () => ({ apiKey: SANDBOX_KEY }),
      registerGlobalExceptionFilter: true,
    })

    const filterProvider = (dyn.providers ?? []).find(
      (p: any) => typeof p === 'object' && p.provide?.toString().includes('APP_FILTER'),
    )
    expect(filterProvider).toBeDefined()
  })
})
