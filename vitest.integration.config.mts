import { defineConfig } from 'vitest/config'
import { swcPlugin } from './vitest.shared.mts'

export default defineConfig({
  plugins: [swcPlugin],
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    testTimeout: 60_000,
  },
})
