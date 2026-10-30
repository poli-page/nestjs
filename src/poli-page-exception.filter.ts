import { Catch, Optional, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common'
import { HttpAdapterHost, type AbstractHttpAdapter } from '@nestjs/core'
import { PoliPageError } from '@poli-page/sdk'
import { throwError, type Observable } from 'rxjs'
import {
  answerPoliPageError,
  isNodeResponseLike,
  nodeResponseTarget,
  type PoliPageErrorTarget,
} from './poli-page-error-response'

/**
 * Answers a `PoliPageError` with the SDK's `toPayload()` as the JSON body:
 * `{ code, message, status, requestId }`. The HTTP status is the payload's
 * `status` (the API status, 503 for `network_error`, 504 for `timeout`), or
 * 500 when the error has none; the body keeps `status: null` in that case.
 * PDF headers the route set (`Content-Disposition`, `Content-Length`) are
 * removed; when the response has already started, the connection is destroyed.
 *
 * It answers through Nest's HTTP adapter, so Express and Fastify both work.
 * Outside HTTP (GraphQL, microservices, WebSockets) it gives the error back
 * unchanged: rethrown, or as an error Observable for microservices.
 *
 * `PoliPageModule` registers it globally unless `registerGlobalExceptionFilter`
 * is `false`.
 */
@Catch(PoliPageError)
export class PoliPageExceptionFilter implements ExceptionFilter {
  constructor(@Optional() private readonly adapterHost?: HttpAdapterHost) {}

  catch(err: PoliPageError, host: ArgumentsHost): Observable<never> | undefined {
    const type = host.getType<string>()
    if (type === 'rpc') return throwError(() => err)
    if (type !== 'http') throw err

    answerPoliPageError(err, this.target(host.switchToHttp().getResponse<unknown>()))
    return undefined
  }

  private target(response: unknown): PoliPageErrorTarget {
    const adapter = this.adapterHost?.httpAdapter
    if (adapter !== undefined) return adapterTarget(adapter, response)
    // Built with `new PoliPageExceptionFilter()`: write to the Node response.
    const raw = rawResponse(response)
    if (isNodeResponseLike(raw)) return nodeResponseTarget(raw)
    throw new Error(
      'PoliPageExceptionFilter: no HTTP adapter and the response is not a Node response; ' +
        'register the filter through Nest (PoliPageModule, APP_FILTER or @UseFilters(PoliPageExceptionFilter))',
    )
  }
}

/** A target that answers through Nest's HTTP adapter (Express, Fastify). */
function adapterTarget(adapter: AbstractHttpAdapter, response: unknown): PoliPageErrorTarget {
  return {
    headersSent: () => adapter.isHeadersSent(response) === true,
    destroy: () => {
      const raw = rawResponse(response)
      if (isNodeResponseLike(raw)) raw.destroy()
    },
    removeHeader: (name) => {
      // Express responses and Fastify replies both have removeHeader().
      if (typeof response === 'object' && response !== null && 'removeHeader' in response) {
        const remove: unknown = response.removeHeader
        if (typeof remove === 'function') remove.call(response, name)
      }
    },
    setHeader: (name, value) => {
      adapter.setHeader(response, name, value)
    },
    sendJson: (status, body) => {
      adapter.reply(response, body, status)
    },
  }
}

/** The Node response: a Fastify reply's `raw`, or the response itself (Express). */
function rawResponse(response: unknown): unknown {
  if (typeof response === 'object' && response !== null && 'raw' in response) {
    return response.raw
  }
  return response
}
