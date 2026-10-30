import { afterEach, describe, it, expect } from '@jest/globals'
import { Controller, Get, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { PoliPageError } from '@poli-page/sdk'
import { get as httpGet, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { Readable } from 'node:stream'
import request from 'supertest'
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

const DOWNLOAD_FAILED = new PoliPageError('Failed to download PDF: HTTP 403', 'DOWNLOAD_FAILED', 403)

/**
 * A stream like render.pdfStream()'s: `chunks` first, then `err`. The error comes on a later
 * tick, once the chunks before it have reached the response.
 */
function failingStream(chunks: readonly Uint8Array[], err: Error): ReadableStream<Uint8Array> {
  let i = 0
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const chunk = chunks[i++]
      if (chunk !== undefined) {
        controller.enqueue(chunk)
        return
      }
      if (chunks.length > 0) await new Promise((done) => setTimeout(done, 50))
      controller.error(err)
    },
  })
}

@Controller()
class StreamController {
  @Get('early')
  early(): PoliPagePdfFile {
    return new PoliPagePdfFile(failingStream([], DOWNLOAD_FAILED), { filename: 'welcome.pdf' })
  }

  @Get('early-other')
  earlyOther(): PoliPagePdfFile {
    return new PoliPagePdfFile(failingStream([], new Error('disk on fire')), {
      filename: 'welcome.pdf',
    })
  }

  @Get('late')
  late(): PoliPagePdfFile {
    return new PoliPagePdfFile(failingStream([PDF_BYTES], DOWNLOAD_FAILED), {
      filename: 'welcome.pdf',
    })
  }
}

describe('PoliPagePdfFile stream errors (Express)', () => {
  let app: INestApplication | undefined

  afterEach(async () => {
    await app?.close()
    app = undefined
  })

  async function start(): Promise<INestApplication> {
    const moduleRef = await Test.createTestingModule({ controllers: [StreamController] }).compile()
    app = moduleRef.createNestApplication({ logger: false })
    await app.init()
    return app
  }

  it('answers a PoliPageError before the first byte with its toPayload() JSON, without PDF headers', async () => {
    const res = await request((await start()).getHttpServer()).get('/early')

    expect(res.status).toBe(403)
    expect(res.type).toBe('application/json')
    expect(res.headers['content-disposition']).toBeUndefined()
    expect(JSON.parse(res.text)).toStrictEqual({
      code: 'DOWNLOAD_FAILED',
      message: 'Failed to download PDF: HTTP 403',
      status: 403,
      requestId: null,
    })
  })

  it('keeps Nest\'s answer for another error before the first byte, without PDF headers', async () => {
    const res = await request((await start()).getHttpServer()).get('/early-other')

    expect(res.status).toBe(400)
    expect(res.type).not.toBe('application/pdf')
    expect(res.headers['content-disposition']).toBeUndefined()
  })

  it('aborts the connection on an error after the first byte, so the PDF is not taken as whole', async () => {
    const server = (await start()).getHttpServer() as Server
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
    const { port } = server.address() as AddressInfo

    const outcome = await new Promise<{ status: number | undefined; complete: boolean }>((done) => {
      const req = httpGet({ host: '127.0.0.1', port, path: '/late' }, (res) => {
        res.resume()
        res.on('close', () => done({ status: res.statusCode, complete: res.complete }))
      })
      req.on('error', () => done({ status: undefined, complete: false }))
    })

    expect(outcome.status).toBe(200)
    expect(outcome.complete).toBe(false)
  })
})
