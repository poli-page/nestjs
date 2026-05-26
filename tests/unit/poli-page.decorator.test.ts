import { describe, it, expect } from '@jest/globals'
import { Test } from '@nestjs/testing'
import { Injectable } from '@nestjs/common'
import { InjectPoliPage } from '../../src/poli-page.decorator'
import { POLI_PAGE_CLIENT_TOKEN } from '../../src/poli-page.tokens'

describe('@InjectPoliPage()', () => {
  it('injects the value bound to POLI_PAGE_CLIENT_TOKEN', async () => {
    const sentinel = { id: 'sentinel-client' }

    @Injectable()
    class Consumer {
      constructor(@InjectPoliPage() public readonly client: unknown) {}
    }

    const moduleRef = await Test.createTestingModule({
      providers: [
        { provide: POLI_PAGE_CLIENT_TOKEN, useValue: sentinel },
        Consumer,
      ],
    }).compile()

    const consumer = moduleRef.get(Consumer)
    expect(consumer.client).toBe(sentinel)
  })
})
