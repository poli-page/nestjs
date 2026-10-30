import { afterEach, describe, it, expect, jest } from '@jest/globals'
import {
  Controller,
  Get,
  Header,
  Logger,
  type ArgumentsHost,
  type INestApplication,
} from '@nestjs/common'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { PoliPageError } from '@poli-page/sdk'
import { isObservable, lastValueFrom } from 'rxjs'
import request from 'supertest'
import { PoliPageExceptionFilter } from '../../src/poli-page-exception.filter'
import { PoliPageModule } from '../../src/poli-page.module'
import { PoliPagePdfFile } from '../../src/responses/poli-page-pdf-file'
import { SANDBOX_KEY } from './fixtures/api-keys'

/** A Node response double: what the filter writes when it is built with `new`. */
class FakeResponse {
  headersSent = false
  statusCode = 200
  destroyed = false
  body: string | undefined
  readonly headers = new Map<string, string>()

  setHeader(name: string, value: string): this {
    this.headers.set(name.toLowerCase(), value)
    return this
  }

  removeHeader(name: string): void {
    this.headers.delete(name.toLowerCase())
  }

  end(body: string): this {
    this.body = body
    this.headersSent = true
    return this
  }

  destroy(): this {
    this.destroyed = true
    return this
  }
}

function httpHost(res: FakeResponse): ArgumentsHost {
  return {
    getType: () => 'http',
    switchToHttp: () => ({ getResponse: () => res, getRequest: () => ({}) }),
  } as unknown as ArgumentsHost
}

function answer(err: PoliPageError, res = new FakeResponse()): {
  status: number
  body: unknown
  res: FakeResponse
} {
  new PoliPageExceptionFilter().catch(err, httpHost(res))
  return { status: res.statusCode, body: JSON.parse(res.body ?? 'null') as unknown, res }
}

describe('PoliPageExceptionFilter', () => {
  it('answers an API error with its status and the toPayload() body', () => {
    const err = new PoliPageError('Template not found', 'TEMPLATE_NOT_FOUND', 404, 'req_1')

    const { status, body, res } = answer(err)

    expect(status).toBe(404)
    expect(body).toEqual({
      code: 'TEMPLATE_NOT_FOUND',
      message: 'Template not found',
      status: 404,
      requestId: 'req_1',
    })
    expect(body).toEqual(err.toPayload())
    expect(res.headers.get('content-type')).toBe('application/json')
    expect(res.headers.get('cache-control')).toBe('no-store, private')
  })

  it('answers a 5xx API error with the same status', () => {
    const { status, body } = answer(new PoliPageError('boom', 'INTERNAL_ERROR', 500, 'req_2'))

    expect(status).toBe(500)
    expect(body).toEqual({ code: 'INTERNAL_ERROR', message: 'boom', status: 500, requestId: 'req_2' })
  })

  it('answers network_error with 503, as toPayload() maps it', () => {
    const { status, body } = answer(new PoliPageError('Network request failed', 'network_error'))

    expect(status).toBe(503)
    expect(body).toEqual({
      code: 'network_error',
      message: 'Network request failed',
      status: 503,
      requestId: null,
    })
  })

  it('answers timeout with 504, as toPayload() maps it', () => {
    const { status, body } = answer(new PoliPageError('Request timed out after 60000ms', 'timeout'))

    expect(status).toBe(504)
    expect(body).toEqual({
      code: 'timeout',
      message: 'Request timed out after 60000ms',
      status: 504,
      requestId: null,
    })
  })

  it('answers 500 for an SDK error with no status, and keeps status null in the body', () => {
    const { status, body } = answer(new PoliPageError('apiKey is required', 'invalid_options'))

    expect(status).toBe(500)
    expect(body).toEqual({
      code: 'invalid_options',
      message: 'apiKey is required',
      status: null,
      requestId: null,
    })
  })

  it('removes the PDF headers a route set before the error', () => {
    const res = new FakeResponse()
      .setHeader('Content-Type', 'application/pdf')
      .setHeader('Content-Disposition', 'attachment; filename="x.pdf"')
      .setHeader('Content-Length', '1234')

    answer(new PoliPageError('Template not found', 'TEMPLATE_NOT_FOUND', 404), res)

    expect(res.headers.has('content-disposition')).toBe(false)
    expect(res.headers.has('content-length')).toBe(false)
    expect(res.headers.get('content-type')).toBe('application/json')
  })

  it('destroys the connection when the response has already started', () => {
    const res = new FakeResponse()
    res.headersSent = true

    new PoliPageExceptionFilter().catch(new PoliPageError('x', 'DOWNLOAD_FAILED', 403), httpHost(res))

    expect(res.destroyed).toBe(true)
    expect(res.body).toBeUndefined()
  })

  it('rethrows the error outside HTTP (GraphQL, WebSockets)', () => {
    const err = new PoliPageError('Template not found', 'TEMPLATE_NOT_FOUND', 404)
    for (const type of ['graphql', 'ws']) {
      const host = { getType: () => type } as unknown as ArgumentsHost
      expect(() => new PoliPageExceptionFilter().catch(err, host)).toThrow(err)
    }
  })

  it('gives the error back as an error Observable to microservices', async () => {
    const err = new PoliPageError('Template not found', 'TEMPLATE_NOT_FOUND', 404)
    const host = { getType: () => 'rpc' } as unknown as ArgumentsHost

    const result = new PoliPageExceptionFilter().catch(err, host)

    expect(isObservable(result)).toBe(true)
    if (!isObservable(result)) return
    await expect(lastValueFrom(result)).rejects.toBe(err)
  })
})

@Controller()
class ThrowingController {
  @Get('fail')
  fail(): never {
    throw new PoliPageError('Template not found', 'TEMPLATE_NOT_FOUND', 404, 'req_http')
  }

  @Get('fail-pdf')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="x.pdf"')
  @Header('Content-Length', '1234')
  failPdf(): never {
    throw new PoliPageError('Template not found', 'TEMPLATE_NOT_FOUND', 404, 'req_pdf')
  }
}

/** A PDF stream that fails before its first chunk, like a failed render.pdfStream() download. */
@Controller()
class StreamController {
  @Get('stream-early')
  streamEarly(): PoliPagePdfFile {
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.error(
          new PoliPageError('Failed to download PDF: network error', 'DOWNLOAD_FAILED'),
        )
      },
    })
    return new PoliPagePdfFile(stream, { filename: 'welcome.pdf' })
  }
}

const NOT_FOUND_BODY = {
  code: 'TEMPLATE_NOT_FOUND',
  message: 'Template not found',
  status: 404,
  requestId: 'req_http',
}

describe('PoliPageExceptionFilter registration (Express)', () => {
  let app: INestApplication | undefined

  afterEach(async () => {
    await app?.close()
    app = undefined
    jest.restoreAllMocks()
  })

  async function start(registerGlobalExceptionFilter: boolean | undefined): Promise<INestApplication> {
    const options =
      registerGlobalExceptionFilter === undefined
        ? { apiKey: SANDBOX_KEY }
        : { apiKey: SANDBOX_KEY, registerGlobalExceptionFilter }
    const moduleRef = await Test.createTestingModule({
      imports: [PoliPageModule.forRoot(options)],
      controllers: [ThrowingController],
    }).compile()
    app = moduleRef.createNestApplication({ logger: false })
    await app.init()
    return app
  }

  it('is on by default: a PoliPageError answers its toPayload() body', async () => {
    const res = await request((await start(undefined)).getHttpServer()).get('/fail')

    expect(res.status).toBe(404)
    expect(res.type).toBe('application/json')
    expect(res.body).toEqual(NOT_FOUND_BODY)
  })

  it('drops the PDF headers set with @Header() before the error', async () => {
    const res = await request((await start(undefined)).getHttpServer()).get('/fail-pdf')

    expect(res.status).toBe(404)
    expect(res.type).toBe('application/json')
    expect(res.headers['content-disposition']).toBeUndefined()
    expect(res.body).toEqual({ ...NOT_FOUND_BODY, requestId: 'req_pdf' })
  })

  it('is off with registerGlobalExceptionFilter: false: Nest answers its own 500', async () => {
    const res = await request((await start(false)).getHttpServer()).get('/fail')

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ statusCode: 500, message: 'Internal server error' })
  })

  it('stays on, with a warning, when a forRootAsync factory returns registerGlobalExceptionFilter', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    const moduleRef = await Test.createTestingModule({
      imports: [
        PoliPageModule.forRootAsync({
          useFactory: () => ({ apiKey: SANDBOX_KEY, registerGlobalExceptionFilter: false }),
        }),
      ],
      controllers: [ThrowingController],
    }).compile()
    app = moduleRef.createNestApplication({ logger: false })
    await app.init()

    const res = await request(app.getHttpServer()).get('/fail')

    expect(res.status).toBe(404)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]?.[0])).toContain(
      'registerGlobalExceptionFilter returned by the forRootAsync factory is ignored',
    )
  })
})

describe('PoliPageExceptionFilter registration (Fastify)', () => {
  let app: NestFastifyApplication | undefined

  afterEach(async () => {
    await app?.close()
    app = undefined
  })

  async function start(): Promise<NestFastifyApplication> {
    const moduleRef = await Test.createTestingModule({
      imports: [PoliPageModule.forRoot({ apiKey: SANDBOX_KEY })],
      controllers: [ThrowingController, StreamController],
    }).compile()
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
      logger: false,
    })
    await app.init()
    await app.getHttpAdapter().getInstance().ready()
    return app
  }

  it('answers the toPayload() body', async () => {
    const res = await (await start()).inject({ method: 'GET', url: '/fail' })

    expect(res.statusCode).toBe(404)
    expect(res.headers['content-type']).toMatch(/^application\/json/)
    expect(res.json()).toEqual(NOT_FOUND_BODY)
  })

  it('drops the PDF headers set with @Header() before the error', async () => {
    const res = await (await start()).inject({ method: 'GET', url: '/fail-pdf' })

    expect(res.statusCode).toBe(404)
    expect(res.headers['content-type']).toMatch(/^application\/json/)
    expect(res.headers['content-disposition']).toBeUndefined()
    expect(res.json()).toEqual({ ...NOT_FOUND_BODY, requestId: 'req_pdf' })
  })

  it('answers a PDF stream error before the first byte without the PDF headers', async () => {
    const res = await (await start()).inject({ method: 'GET', url: '/stream-early' })

    expect(res.statusCode).toBe(500)
    expect(res.headers['content-type']).toMatch(/^application\/json/)
    expect(res.headers['content-disposition']).toBeUndefined()
    expect(res.json()).toStrictEqual({
      code: 'DOWNLOAD_FAILED',
      message: 'Failed to download PDF: network error',
      status: null,
      requestId: null,
    })
  })
})
