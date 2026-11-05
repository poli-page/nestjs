import { describe, it, expect, vi } from 'vitest'
import { Test } from '@nestjs/testing'
import type { PoliPage } from '@poli-page/sdk'
import { PoliPageService } from '../../src/poli-page.service'
import { POLI_PAGE_CLIENT_TOKEN } from '../../src/poli-page.tokens'

describe('PoliPageService', () => {
  function stubClient(): PoliPage {
    return {
      render: {
        pdf: vi.fn(),
        pdfStream: vi.fn(),
        document: vi.fn(),
      },
      documents: {
        get: vi.fn(),
        preview: vi.fn(),
        thumbnails: vi.fn(),
        delete: vi.fn(),
      },
    } as unknown as PoliPage
  }

  async function build(client: PoliPage): Promise<PoliPageService> {
    const moduleRef = await Test.createTestingModule({
      providers: [
        { provide: POLI_PAGE_CLIENT_TOKEN, useValue: client },
        PoliPageService,
      ],
    }).compile()
    return moduleRef.get(PoliPageService)
  }

  it('exposes the underlying client', async () => {
    const client = stubClient()
    const service = await build(client)
    expect(service.client).toBe(client)
  })

  it('delegates .render to client.render', async () => {
    const client = stubClient()
    const service = await build(client)
    expect(service.render).toBe(client.render)
  })

  it('delegates .documents to client.documents', async () => {
    const client = stubClient()
    const service = await build(client)
    expect(service.documents).toBe(client.documents)
  })

  it('calling service.render.pdf(input) invokes client.render.pdf', async () => {
    const client = stubClient()
    const service = await build(client)
    const input = { project: 'p', template: 't', data: {} } as any
    service.render.pdf(input)
    expect(client.render.pdf).toHaveBeenCalledWith(input)
  })
})
