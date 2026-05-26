import { Catch, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common'
import { PoliPageError } from '@poli-page/sdk'

interface ResponseLike {
  status(code: number): ResponseLike
  json(body: unknown): ResponseLike
  setHeader(name: string, value: string): ResponseLike
}

@Catch(PoliPageError)
export class PoliPageExceptionFilter implements ExceptionFilter {
  catch(err: PoliPageError, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<ResponseLike>()

    const isNetwork = err.isNetworkError()
    const status = !isNetwork && typeof err.status === 'number' && err.status >= 400 && err.status < 600
      ? err.status
      : 502

    const code = isNetwork ? 'NETWORK_ERROR' : err.code

    res.setHeader('Cache-Control', 'no-store, private')
    res.status(status).json({
      code,
      message: err.message,
      requestId: err.requestId ?? null,
    })
  }
}
