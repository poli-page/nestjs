import { describe, it, expect, jest } from '@jest/globals'
import { PoliPageError } from '@poli-page/sdk'
import type { ArgumentsHost } from '@nestjs/common'
import { PoliPageExceptionFilter } from '../../src/poli-page-exception.filter'

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

describe('PoliPageExceptionFilter', () => {
  it('maps a 4xx PoliPageError to same status with typed JSON body', () => {
    const filter = new PoliPageExceptionFilter()
    const { host, res } = fakeHost()
    const err = new PoliPageError('Bad version', 'INVALID_VERSION_FORMAT', 400, 'req_1')

    filter.catch(err, host)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      code: 'INVALID_VERSION_FORMAT',
      message: 'Bad version',
      requestId: 'req_1',
    })
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store, private')
  })

  it('maps a 5xx PoliPageError to same status', () => {
    const filter = new PoliPageExceptionFilter()
    const { host, res } = fakeHost()
    const err = new PoliPageError('boom', 'INTERNAL_ERROR', 503, 'req_2')

    filter.catch(err, host)

    expect(res.status).toHaveBeenCalledWith(503)
  })

  it('maps network errors (no status) to 502 with NETWORK_ERROR', () => {
    const filter = new PoliPageExceptionFilter()
    const { host, res } = fakeHost()
    const err = new PoliPageError('timeout', 'network_error')

    filter.catch(err, host)

    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.json).toHaveBeenCalledWith({
      code: 'NETWORK_ERROR',
      message: 'timeout',
      requestId: null,
    })
  })

  it('maps timeout errors to 502 with NETWORK_ERROR', () => {
    const filter = new PoliPageExceptionFilter()
    const { host, res } = fakeHost()
    const err = new PoliPageError('timed out', 'timeout')

    filter.catch(err, host)

    expect(res.status).toHaveBeenCalledWith(502)
    const body = (res.json.mock.calls[0] as any[])[0]
    expect(body.code).toBe('NETWORK_ERROR')
  })
})
