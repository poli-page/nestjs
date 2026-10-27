export const SECRET = '0123456789abcdef0123456789abcdef'

export const SANDBOX_KEY = `pp_sandbox_${SECRET}`

// The warning shows the `pp_{env}_` part only up to this `{env}` length.
export const LONGEST_SHOWN_ENV = 'a'.repeat(20)
const TOO_LONG_ENV = 'a'.repeat(21)

export const WELL_FORMED_KEYS = [SANDBOX_KEY, `pp_live_${SECRET}`, `pp_eu-prod_${SECRET}`]

// Keys whose `pp_{env}_` part is outside the contract's env grammar: the
// warning shows no key text for them, since that part may be secret material.
export const UNSHOWN_ENV_KEYS = [
  'pp_0123456789abcdef0123_rest',
  `pp_2fa_${SECRET}`,
  `pp_Sandbox_${SECRET}`,
  `pp_a--b_${SECRET}`,
  `pp_-eu_${SECRET}`,
  `pp_eu-_${SECRET}`,
  `pp_${TOO_LONG_ENV}_${SECRET}`,
  `pp_${SECRET}_${SECRET}`,
]

export const MALFORMED_KEYS = ['pp_sandbox_x', ...UNSHOWN_ENV_KEYS, `sk_live_${SECRET}`]
