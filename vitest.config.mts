import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { swcPlugin } from './vitest.shared.mts'

const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('.', import.meta.url))

/**
 * The contract test loads the example app's modules. They import these packages, which must
 * be the copies this package uses (one Nest, one SDK), even when example-app/node_modules is
 * installed; @poli-page/nestjs is this repo's source.
 */
const SHARED_WITH_EXAMPLE_APP = [
  '@nestjs/common',
  '@nestjs/core',
  '@poli-page/sdk',
  '@poli-page/sdk/node',
  'reflect-metadata',
  'rxjs',
]

export default defineConfig({
  plugins: [swcPlugin],
  resolve: {
    alias: [
      { find: /^@poli-page\/nestjs$/, replacement: `${root}src/index.ts` },
      ...SHARED_WITH_EXAMPLE_APP.map((id) => ({
        find: new RegExp(`^${id.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}$`),
        replacement: require.resolve(id, { paths: [root] }),
      })),
    ],
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/contract/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
    },
  },
})
