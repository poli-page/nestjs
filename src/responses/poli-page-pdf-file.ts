import { StreamableFile } from '@nestjs/common'
import { Readable } from 'node:stream'
import { contentDisposition } from './headers'

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
  }
}

function toNodeReadable(
  body: Uint8Array | Buffer | Readable | ReadableStream<Uint8Array>,
): Readable {
  if (body instanceof Readable) return body
  if (body instanceof Uint8Array) return Readable.from(Buffer.from(body))
  return Readable.fromWeb(body as any)
}
