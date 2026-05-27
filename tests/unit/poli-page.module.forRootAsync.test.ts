import { afterEach, describe, it, expect } from '@jest/globals'
import { Test, type TestingModule } from '@nestjs/testing'
import { Injectable, Module } from '@nestjs/common'
import { PoliPage } from '@poli-page/sdk'
import { PoliPageModule } from '../../src/poli-page.module'
import { POLI_PAGE_CLIENT_TOKEN } from '../../src/poli-page.tokens'
import type { PoliPageOptionsFactory, PoliPageModuleOptions } from '../../src/poli-page.options'

describe('PoliPageModule.forRootAsync', () => {
  let moduleRef: TestingModule | undefined

  afterEach(async () => {
    await moduleRef?.close()
    moduleRef = undefined
  })

  it('resolves with useFactory + no inject', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        PoliPageModule.forRootAsync({
          useFactory: () => ({ apiKey: 'pp_test_factory' }),
        }),
      ],
    }).compile()

    expect(moduleRef.get(POLI_PAGE_CLIENT_TOKEN)).toBeInstanceOf(PoliPage)
  })

  it('resolves with useFactory + inject', async () => {
    @Injectable()
    class ConfigStub {
      get apiKey(): string { return 'pp_test_from_config' }
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
        return { apiKey: 'pp_test_class' }
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
        return { apiKey: 'pp_test_existing' }
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
          useFactory: () => ({ apiKey: 'sk_bad_prefix' }),
        }),
      ],
    }).compile()

    await expect(promise).rejects.toThrow(/pp_test_|pp_live_/)
  })

  it('supports async useFactory (Promise return)', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        PoliPageModule.forRootAsync({
          useFactory: async () => {
            await new Promise(r => setTimeout(r, 1))
            return { apiKey: 'pp_test_async' }
          },
        }),
      ],
    }).compile()

    expect(moduleRef.get(POLI_PAGE_CLIENT_TOKEN)).toBeInstanceOf(PoliPage)
  })

  it('registers global filter when registerGlobalExceptionFilter:true', () => {
    const dyn = PoliPageModule.forRootAsync({
      useFactory: () => ({ apiKey: 'pp_test_x' }),
      registerGlobalExceptionFilter: true,
    })

    const filterProvider = (dyn.providers ?? []).find(
      (p: any) => typeof p === 'object' && p.provide?.toString().includes('APP_FILTER'),
    )
    expect(filterProvider).toBeDefined()
  })
})
