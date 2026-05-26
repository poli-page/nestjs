import { writeFileSync } from 'node:fs'
import { PoliPage } from '@poli-page/sdk'

const apiKey = process.env.POLI_PAGE_API_KEY
if (apiKey === undefined) {
  console.error('POLI_PAGE_API_KEY env var is required.')
  process.exit(1)
}

async function main(): Promise<void> {
  const baseUrl = process.env.POLI_PAGE_BASE_URL
  const client = baseUrl !== undefined
    ? new PoliPage({ apiKey: apiKey!, baseUrl })
    : new PoliPage({ apiKey: apiKey! })
  const pdf = await client.render.pdf({
    project: 'getting-started',
    template: 'welcome',
    version: '1.0.0',
    data: { name: 'renderToFile demo' },
  })

  const path = '/tmp/poli-page-demo-file.pdf'
  writeFileSync(path, pdf)
  console.log(`Wrote ${path} (${pdf.byteLength} bytes)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
