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

    const payload = err.toPayload()
    const status = payload.status ?? 500

    res.setHeader('Cache-Control', 'no-store, private')
    res.status(status).json({
      code: payload.code,
      message: payload.message,
      status,
      requestId: payload.requestId,
    })
  }
}
