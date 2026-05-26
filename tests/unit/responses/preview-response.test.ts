import { describe, it, expect } from '@jest/globals'
import { previewResponse } from '../../../src/responses/preview-response'

describe('previewResponse', () => {
  it('wraps html with default contentType + cacheControl', () => {
    const r = previewResponse('<h1>Hi</h1>')
    expect(r).toEqual({
      html: '<h1>Hi</h1>',
      contentType: 'text/html; charset=utf-8',
      cacheControl: 'no-store, private',
    })
  })

  it('honors cacheControl override', () => {
    const r = previewResponse('<h1>Hi</h1>', { cacheControl: 'public, max-age=300' })
    expect(r.cacheControl).toBe('public, max-age=300')
  })

  it('does not mutate the input html', () => {
    const html = '<h1>Hi</h1>'
    const r = previewResponse(html)
    expect(r.html).toBe(html)
  })
})
