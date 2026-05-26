import { describe, it, expect } from '@jest/globals'
import { contentDisposition, isAsciiSafe, rfc5987Encode } from '../../../src/responses/headers'

describe('isAsciiSafe', () => {
  it('returns true for plain ASCII', () => {
    expect(isAsciiSafe('invoice-123.pdf')).toBe(true)
  })
  it('returns false for non-ASCII', () => {
    expect(isAsciiSafe('facture-éléphant.pdf')).toBe(false)
  })
})

describe('rfc5987Encode', () => {
  it('percent-encodes UTF-8 bytes', () => {
    expect(rfc5987Encode('café.pdf')).toBe('caf%C3%A9.pdf')
  })
  it('leaves ASCII alone', () => {
    expect(rfc5987Encode('plain.pdf')).toBe('plain.pdf')
  })
})

describe('contentDisposition', () => {
  it('returns attachment + ASCII filename when safe', () => {
    expect(contentDisposition('invoice.pdf', false))
      .toBe('attachment; filename="invoice.pdf"')
  })
  it('returns inline when inline:true', () => {
    expect(contentDisposition('invoice.pdf', true))
      .toBe('inline; filename="invoice.pdf"')
  })
  it('emits both fallback and filename* for non-ASCII', () => {
    expect(contentDisposition('café.pdf', false))
      .toBe(`attachment; filename="caf_.pdf"; filename*=UTF-8''caf%C3%A9.pdf`)
  })
  it('escapes embedded quotes', () => {
    expect(contentDisposition('say "hi".pdf', false))
      .toContain('filename="say \\"hi\\".pdf"')
  })
})
