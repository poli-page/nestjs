import { StreamableFile } from '@nestjs/common'
import { PoliPageError } from '@poli-page/sdk'
import { Readable } from 'node:stream'
import { contentDisposition } from './headers'
import {
  answerPoliPageError,
  isNodeResponseLike,
  nodeResponseTarget,
} from '../poli-page-error-response'

export interface PoliPagePdfFileOptions {
  filename?: string
  inline?: boolean
  cacheControl?: string
}

export class PoliPagePdfFile extends StreamableFile {
  public readonly cacheControl: string

  constructor(
    body: Uint8Array | Buffer | Readable | ReadableStream<Uint8Array>,
    options: PoliPagePdfFileOptions = {},
  ) {
    const stream = toNodeReadable(body)
    const disposition = options.filename !== undefined
      ? contentDisposition(options.filename, options.inline ?? false)
      : (options.inline === true ? 'inline' : 'attachment')

    super(stream, {
      type: 'application/pdf',
      disposition,
    })
    this.cacheControl = options.cacheControl ?? 'no-store, private'

    // A stream from render.pdfStream() can fail after the route returned, e.g.
    // DOWNLOAD_FAILED while the PDF downloads. That error never reaches the
    // exception filters, and Nest's default handler would answer 400 text
    // under the PDF headers, or end a started response as if it were whole.
    const fallback = this.errorHandler
    this.setErrorHandler((err, res) => {
      if (res.destroyed) return
      if (!isNodeResponseLike(res)) {
        fallback(err, res)
        return
      }
      if (err instanceof PoliPageError) {
        answerPoliPageError(err, nodeResponseTarget(res))
        return
      }
      if (res.headersSent) {
        res.destroy()
        return
      }
      res.removeHeader('Content-Disposition')
      res.removeHeader('Content-Length')
      res.removeHeader('Content-Type')
      fallback(err, res)
    })
  }
}

function toNodeReadable(
  body: Uint8Array | Buffer | Readable | ReadableStream<Uint8Array>,
): Readable {
  if (body instanceof Readable) return body
  if (body instanceof Uint8Array) return Readable.from(Buffer.from(body))
  return Readable.fromWeb(body as any)
}
