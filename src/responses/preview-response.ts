export interface PreviewResponseOptions {
  cacheControl?: string
}

export interface PreviewResponse {
  html: string
  contentType: 'text/html; charset=utf-8'
  cacheControl: string
}

export function previewResponse(
  html: string,
  options: PreviewResponseOptions = {},
): PreviewResponse {
  return {
    html,
    contentType: 'text/html; charset=utf-8',
    cacheControl: options.cacheControl ?? 'no-store, private',
  }
}
