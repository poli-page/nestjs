import { afterEach, describe, it, expect, jest } from '@jest/globals'
import { Controller, Get, type ArgumentsHost, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { PoliPageError } from '@poli-page/sdk'
import request from 'supertest'
import { PoliPageExceptionFilter } from '../../src/poli-page-exception.filter'
import { PoliPageModule } from '../../src/poli-page.module'
import { SANDBOX_KEY } from './fixtures/api-keys'

function fakeHost(): { host: ArgumentsHost; res: { status: jest.Mock; json: jest.Mock; setHeader: jest.Mock } } {
  const res = {
    status: jest.fn().mockReturnThis() as jest.Mock,
    json: jest.fn().mockReturnThis() as jest.Mock,
    setHeader: jest.fn().mockReturnThis() as jest.Mock,
  }
  const host = {
    switchToHttp: () => ({ getResponse: () => res, getRequest: () => ({}) }),
  } as unknown as ArgumentsHost
  return { host, res }
}

function answer(err: PoliPageError): { status: unknown; body: unknown; headers: unknown[] } {
  const { host, res } = fakeHost()
  new PoliPageExceptionFilter().catch(err, host)
  expect(res.status).toHaveBeenCalledTimes(1)
  expect(res.json).toHaveBeenCalledTimes(1)
  return {
    status: res.status.mock.calls[0]?.[0],
    body: res.json.mock.calls[0]?.[0],
    headers: res.setHeader.mock.calls,
  }
}

describe('PoliPageExceptionFilter', () => {
  it('answers an API error with its status and the toPayload() body', () => {
    const err = new PoliPageError('Template not found', 'TEMPLATE_NOT_FOUND', 404, 'req_1')

    const { status, body, headers } = answer(err)

    expect(status).toBe(404)
    expect(body).toEqual({
      code: 'TEMPLATE_NOT_FOUND',
      message: 'Template not found',
      status: 404,
      requestId: 'req_1',
    })
    expect(body).toEqual(err.toPayload())
    expect(headers).toEqual(
      expect.arrayContaining([
        ['Content-Type', 'application/json'],
        ['Cache-Control', 'no-store, private'],
      ]),
    )
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
})

@Controller()
class ThrowingController {
  @Get('fail')
  fail(): never {
    throw new PoliPageError('Template not found', 'TEMPLATE_NOT_FOUND', 404, 'req_http')
  }
}

describe('PoliPageExceptionFilter registration', () => {
  let app: INestApplication | undefined

  afterEach(async () => {
    await app?.close()
    app = undefined
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
    expect(res.body).toEqual({
      code: 'TEMPLATE_NOT_FOUND',
      message: 'Template not found',
      status: 404,
      requestId: 'req_http',
    })
  })

  it('is off with registerGlobalExceptionFilter: false: Nest answers its own 500', async () => {
    const res = await request((await start(false)).getHttpServer()).get('/fail')

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ statusCode: 500, message: 'Internal server error' })
  })
})
