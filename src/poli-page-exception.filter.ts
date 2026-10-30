import { Catch, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common'
import { PoliPageError } from '@poli-page/sdk'

interface ResponseLike {
  status(code: number): ResponseLike
  json(body: unknown): ResponseLike
  setHeader(name: string, value: string): ResponseLike
}

/**
 * Answers a `PoliPageError` with the SDK's `toPayload()` as the JSON body:
 * `{ code, message, status, requestId }`. The HTTP status is the payload's
 * `status` (the API status, 503 for `network_error`, 504 for `timeout`), or
 * 500 when the error has none; the body keeps `status: null` in that case.
 *
 * `PoliPageModule` registers it globally unless `registerGlobalExceptionFilter`
 * is `false`.
 */
@Catch(PoliPageError)
export class PoliPageExceptionFilter implements ExceptionFilter {
  catch(err: PoliPageError, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<ResponseLike>()

    const payload = err.toPayload()

    res.setHeader('Cache-Control', 'no-store, private')
    res.setHeader('Content-Type', 'application/json')
    res.status(payload.status ?? 500).json(payload)
  }
}
