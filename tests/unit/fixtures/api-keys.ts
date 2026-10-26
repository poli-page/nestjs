export const SECRET = '0123456789abcdef0123456789abcdef'

export const SANDBOX_KEY = `pp_sandbox_${SECRET}`

export const WELL_FORMED_KEYS = [SANDBOX_KEY, `pp_live_${SECRET}`, `pp_eu-prod_${SECRET}`]

export const MALFORMED_KEYS = [
  'pp_sandbox_x',
  `pp_Sandbox_${SECRET}`,
  `pp_2fa_${SECRET}`,
  `pp_a--b_${SECRET}`,
  `pp_${'a'.repeat(21)}_${SECRET}`,
  `pp_${SECRET}_${SECRET}`,
  `sk_live_${SECRET}`,
]
