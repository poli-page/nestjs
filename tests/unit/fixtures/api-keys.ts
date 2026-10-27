import { expect } from '@jest/globals'

export const SECRET = '0123456789abcdef0123456789abcdef'

export const SANDBOX_KEY = `pp_sandbox_${SECRET}`

const LONGEST_ENV = 'a'.repeat(20)
const TOO_LONG_ENV = 'a'.repeat(21)

export const WELL_FORMED_KEYS = [
  SANDBOX_KEY,
  `pp_live_${SECRET}`,
  `pp_eu-prod_${SECRET}`,
  `pp_${LONGEST_ENV}_${SECRET}`,
]

export const MALFORMED_KEYS = [
  // A grammar-valid `pp_{env}_` part is still not shown: a mis-pasted secret
  // fragment can look like an environment name.
  'pp_sandbox_XYZ',
  'pp_sandbox_x',
  // `{env}` is a hex fragment of a secret.
  `pp_abc123_${SECRET.slice(0, 16)}`,
  `${SANDBOX_KEY}\n`,
  'pp_0123456789abcdef0123_rest',
  `pp_2fa_${SECRET}`,
  `pp_Sandbox_${SECRET}`,
  `pp_a--b_${SECRET}`,
  `pp_-eu_${SECRET}`,
  `pp_eu-_${SECRET}`,
  `pp_${TOO_LONG_ENV}_${SECRET}`,
  `pp_${SECRET}_${SECRET}`,
  `sk_live_${SECRET}`,
]

// Fails when `message` shows any part of `key`: the whole key, its
// `{prefix}_{env}_` part, or any `_`-separated segment of 3+ characters.
export function expectNoKeyText(message: string, key: string): void {
  const trimmed = key.trim()
  expect(message).not.toContain(trimmed)
  const prefix = /^[^_]*_[^_]*_/.exec(trimmed)?.[0]
  if (prefix !== undefined) {
    expect(message).not.toContain(prefix)
  }
  for (const segment of trimmed.split('_').filter((part) => part.length >= 3)) {
    expect(message).not.toContain(segment)
  }
}
