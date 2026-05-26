import { describe, it, expect } from '@jest/globals'
import { Test } from '@nestjs/testing'
import { Injectable, Module } from '@nestjs/common'
import { PoliPage } from '@poli-page/sdk'
import { PoliPageModule } from '../../src/poli-page.module'
import { PoliPageService } from '../../src/poli-page.service'
import { InjectPoliPage } from '../../src/poli-page.decorator'
import { POLI_PAGE_CLIENT_TOKEN } from '../../src/poli-page.tokens'

describe('PoliPageModule.forRoot', () => {
  it('resolves POLI_PAGE_CLIENT_TOKEN to a PoliPage instance', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PoliPageModule.forRoot({ apiKey: 'pp_test_abc' })],
    }).compile()

    const client = moduleRef.get(POLI_PAGE_CLIENT_TOKEN)
    expect(client).toBeInstanceOf(PoliPage)
  })

  it('exposes PoliPageService', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PoliPageModule.forRoot({ apiKey: 'pp_test_abc' })],
    }).compile()

    const service = moduleRef.get(PoliPageService)
    expect(service.client).toBeInstanceOf(PoliPage)
  })

  it('@InjectPoliPage() works across module boundaries (Global)', async () => {
    @Injectable()
    class Consumer {
      constructor(@InjectPoliPage() public readonly client: PoliPage) {}
    }

    @Module({ providers: [Consumer], exports: [Consumer] })
    class FeatureModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [
        PoliPageModule.forRoot({ apiKey: 'pp_test_abc' }),
        FeatureModule,
      ],
    }).compile()

    const consumer = moduleRef.get(Consumer)
    expect(consumer.client).toBeInstanceOf(PoliPage)
  })

  it('throws at registration when apiKey is missing', () => {
    expect(() => PoliPageModule.forRoot({} as any))
      .toThrow(/apiKey/)
  })

  it('throws at registration when apiKey has bad prefix', () => {
    expect(() => PoliPageModule.forRoot({ apiKey: 'sk_test_x' }))
      .toThrow(/pp_test_|pp_live_/)
  })

  it('does not register global filter by default', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PoliPageModule.forRoot({ apiKey: 'pp_test_abc' })],
    }).compile()

    expect(moduleRef).toBeDefined()
  })

  it('registers a global filter when registerGlobalExceptionFilter is true', () => {
    const dyn = PoliPageModule.forRoot({
      apiKey: 'pp_test_abc',
      registerGlobalExceptionFilter: true,
    })

    const filterProvider = (dyn.providers ?? []).find(
      (p: any) => typeof p === 'object' && p.provide?.toString().includes('APP_FILTER'),
    )
    expect(filterProvider).toBeDefined()
  })
})
