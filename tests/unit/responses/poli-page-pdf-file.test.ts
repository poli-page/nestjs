import { describe, it, expect } from '@jest/globals'
import { Readable } from 'node:stream'
import { PoliPagePdfFile } from '../../../src/responses/poli-page-pdf-file'

const PDF_BYTES = Buffer.from('%PDF-1.4\nstub\n')

describe('PoliPagePdfFile', () => {
  it('defaults Content-Type to application/pdf', () => {
    const file = new PoliPagePdfFile(PDF_BYTES, { filename: 'invoice.pdf' })
    expect(file.options.type).toBe('application/pdf')
  })

  it('sets attachment disposition with ASCII filename', () => {
    const file = new PoliPagePdfFile(PDF_BYTES, { filename: 'invoice.pdf' })
    expect(file.options.disposition).toBe('attachment; filename="invoice.pdf"')
  })

  it('sets inline disposition when inline:true', () => {
    const file = new PoliPagePdfFile(PDF_BYTES, { filename: 'invoice.pdf', inline: true })
    expect(file.options.disposition).toBe('inline; filename="invoice.pdf"')
  })

  it('RFC 5987-encodes non-ASCII filenames', () => {
    const file = new PoliPagePdfFile(PDF_BYTES, { filename: 'café.pdf' })
    expect(file.options.disposition)
      .toBe(`attachment; filename="caf_.pdf"; filename*=UTF-8''caf%C3%A9.pdf`)
  })

  it('defaults Cache-Control to no-store, private', () => {
    const file = new PoliPagePdfFile(PDF_BYTES, { filename: 'x.pdf' })
    expect(file.cacheControl).toBe('no-store, private')
  })

  it('honors cacheControl override', () => {
    const file = new PoliPagePdfFile(PDF_BYTES, {
      filename: 'x.pdf',
      cacheControl: 'public, max-age=60',
    })
    expect(file.cacheControl).toBe('public, max-age=60')
  })

  it('omits filename when none provided (attachment-only)', () => {
    const file = new PoliPagePdfFile(PDF_BYTES)
    expect(file.options.disposition).toBe('attachment')
  })

  it('accepts Uint8Array', () => {
    const file = new PoliPagePdfFile(new Uint8Array(PDF_BYTES))
    expect(file.options.type).toBe('application/pdf')
  })

  it('accepts a Node Readable stream', () => {
    const stream = Readable.from([PDF_BYTES])
    const file = new PoliPagePdfFile(stream)
    expect(file.options.type).toBe('application/pdf')
  })

  it('accepts a Web ReadableStream by converting to Node Readable', () => {
    const webStream = new ReadableStream<Uint8Array>({
      start(c) { c.enqueue(new Uint8Array(PDF_BYTES)); c.close() },
    })
    const file = new PoliPagePdfFile(webStream)
    expect(file.options.type).toBe('application/pdf')
  })
})
