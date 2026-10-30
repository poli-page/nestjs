import type { PoliPageError } from '@poli-page/sdk'

/** Where a `PoliPageError` answer is written: a platform response seen through a few operations. */
export interface PoliPageErrorTarget {
  headersSent(): boolean
  /** Closes the connection without ending the body cleanly, so a partial PDF is not taken as whole. */
  destroy(): void
  removeHeader(name: string): void
  setHeader(name: string, value: string): void
  /** Sends `body` as JSON with `status`. */
  sendJson(status: number, body: unknown): void
}

/**
 * Answers `err` with the SDK's `toPayload()` as the JSON body: `{ code, message, status,
 * requestId }`. The HTTP status is the payload's `status` (the API status, 503 for
 * `network_error`, 504 for `timeout`), or 500 when the error has none; the body keeps
 * `status: null` in that case.
 *
 * Headers a route set for a PDF (`Content-Disposition`, `Content-Length`) are removed first. When
 * the headers are already sent, the body can no longer be replaced: the connection is destroyed.
 */
export function answerPoliPageError(err: PoliPageError, target: PoliPageErrorTarget): void {
  if (target.headersSent()) {
    target.destroy()
    return
  }
  const payload = err.toPayload()
  target.removeHeader('Content-Disposition')
  target.removeHeader('Content-Length')
  target.setHeader('Content-Type', 'application/json')
  target.setHeader('Cache-Control', 'no-store, private')
  target.sendJson(payload.status ?? 500, payload)
}

/** The parts of a Node `http.ServerResponse` (an Express response is one) used here. */
export interface NodeResponseLike {
  headersSent: boolean
  statusCode: number
  removeHeader(name: string): void
  setHeader(name: string, value: string): unknown
  end(body: string): unknown
  destroy(): unknown
}

/** A target that writes straight to a Node `http.ServerResponse`. */
export function nodeResponseTarget(res: NodeResponseLike): PoliPageErrorTarget {
  return {
    headersSent: () => res.headersSent,
    destroy: () => {
      res.destroy()
    },
    removeHeader: (name) => res.removeHeader(name),
    setHeader: (name, value) => {
      res.setHeader(name, value)
    },
    sendJson: (status, body) => {
      res.statusCode = status
      res.end(JSON.stringify(body))
    },
  }
}

export function isNodeResponseLike(value: unknown): value is NodeResponseLike {
  if (typeof value !== 'object' || value === null) return false
  const res = value as Record<string, unknown>
  return (
    typeof res.headersSent === 'boolean' &&
    typeof res.removeHeader === 'function' &&
    typeof res.setHeader === 'function' &&
    typeof res.end === 'function' &&
    typeof res.destroy === 'function'
  )
}
