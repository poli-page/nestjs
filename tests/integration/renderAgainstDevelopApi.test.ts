import { describe, it, expect } from '@jest/globals'
import { Test } from '@nestjs/testing'
import { PoliPage } from '@poli-page/sdk'
import { PoliPageModule } from '../../src/poli-page.module'
import { POLI_PAGE_CLIENT_TOKEN } from '../../src/poli-page.tokens'

const apiKey = process.env.POLI_PAGE_API_KEY
const skip = apiKey === undefined || !apiKey.startsWith('pp_test_')
const describeMaybe = skip ? describe.skip : describe

describeMaybe('render welcome against live API', () => {
  it('resolves the module-provided PoliPage and renders a PDF', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        PoliPageModule.forRoot({
          apiKey: apiKey!,
          ...(process.env.POLI_PAGE_TEST_BASE_URL
            ? { baseUrl: process.env.POLI_PAGE_TEST_BASE_URL }
            : {}),
        }),
      ],
    }).compile()

    const client = moduleRef.get<PoliPage>(POLI_PAGE_CLIENT_TOKEN)

    const pdf = await client.render.pdf({
      project: 'getting-started',
      template: 'welcome',
      version: '1.0.0',
      data: { name: 'nestjs integration test' },
    })

    const bytes = pdf instanceof Uint8Array ? pdf : new Uint8Array(pdf as ArrayBuffer)
    expect(bytes.byteLength).toBeGreaterThan(1000)
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
  }, 30_000)
})
