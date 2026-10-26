import { afterEach, describe, it, expect, jest } from '@jest/globals'
import { Test, type TestingModule } from '@nestjs/testing'
import { Injectable, Logger, Module } from '@nestjs/common'
import { PoliPage } from '@poli-page/sdk'
import { PoliPageModule } from '../../src/poli-page.module'
import { PoliPageService } from '../../src/poli-page.service'
import { InjectPoliPage } from '../../src/poli-page.decorator'
import { POLI_PAGE_CLIENT_TOKEN } from '../../src/poli-page.tokens'
import { MALFORMED_KEYS, SANDBOX_KEY, SECRET, WELL_FORMED_KEYS } from './fixtures/api-keys'

describe('PoliPageModule.forRoot', () => {
  let moduleRef: TestingModule | undefined

  afterEach(async () => {
    await moduleRef?.close()
    moduleRef = undefined
    jest.restoreAllMocks()
  })

  it('resolves POLI_PAGE_CLIENT_TOKEN to a PoliPage instance', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PoliPageModule.forRoot({ apiKey: SANDBOX_KEY })],
    }).compile()

    const client = moduleRef.get(POLI_PAGE_CLIENT_TOKEN)
    expect(client).toBeInstanceOf(PoliPage)
  })

  it('exposes PoliPageService', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PoliPageModule.forRoot({ apiKey: SANDBOX_KEY })],
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

    moduleRef = await Test.createTestingModule({
      imports: [
        PoliPageModule.forRoot({ apiKey: SANDBOX_KEY }),
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

  it('throws at registration when apiKey is empty', () => {
    expect(() => PoliPageModule.forRoot({ apiKey: '' }))
      .toThrow(/apiKey/)
  })

  it.each(WELL_FORMED_KEYS)('boots with %s and no warning', async (key) => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)

    moduleRef = await Test.createTestingModule({
      imports: [PoliPageModule.forRoot({ apiKey: key })],
    }).compile()

    expect(moduleRef.get(POLI_PAGE_CLIENT_TOKEN)).toBeInstanceOf(PoliPage)
    expect(warn).not.toHaveBeenCalled()
  })

  it.each(MALFORMED_KEYS)('boots with %s and exactly one warning that hides the secret', async (key) => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)

    moduleRef = await Test.createTestingModule({
      imports: [PoliPageModule.forRoot({ apiKey: key })],
    }).compile()

    expect(moduleRef.get(POLI_PAGE_CLIENT_TOKEN)).toBeInstanceOf(PoliPage)
    expect(warn).toHaveBeenCalledTimes(1)
    const message = String(warn.mock.calls[0]?.[0])
    expect(message).not.toContain(key)
    expect(message).not.toContain(SECRET)
  })

  it('does not register global filter by default', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PoliPageModule.forRoot({ apiKey: SANDBOX_KEY })],
    }).compile()

    expect(moduleRef).toBeDefined()
  })

  it('registers a global filter when registerGlobalExceptionFilter is true', () => {
    const dyn = PoliPageModule.forRoot({
      apiKey: SANDBOX_KEY,
      registerGlobalExceptionFilter: true,
    })

    const filterProvider = (dyn.providers ?? []).find(
      (p: any) => typeof p === 'object' && p.provide?.toString().includes('APP_FILTER'),
    )
    expect(filterProvider).toBeDefined()
  })
})
