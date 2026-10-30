import type { Config } from 'jest'

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

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const config: Config = {
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/tests/unit', '<rootDir>/tests/contract'],
  testRegex: '.*\\.test\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { isolatedModules: true }],
  },
  moduleNameMapper: {
    '^@poli-page/nestjs$': '<rootDir>/src/index.ts',
    ...Object.fromEntries(
      SHARED_WITH_EXAMPLE_APP.map((id) => [
        `^${escapeRegExp(id)}$`,
        require.resolve(id, { paths: [__dirname] }),
      ]),
    ),
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  verbose: true,
  forceExit: true,
}

export default config
