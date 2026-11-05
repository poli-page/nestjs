import swc from 'unplugin-swc'
import type { Plugin } from 'vite'

/**
 * Vitest transforms TypeScript with esbuild, which does not emit decorator metadata.
 * Nest's dependency injection reads that metadata, so SWC compiles the sources and tests.
 */
export const swcPlugin: Plugin = swc.vite({
  jsc: {
    target: 'es2022',
    parser: { syntax: 'typescript', decorators: true },
    transform: { legacyDecorator: true, decoratorMetadata: true },
  },
})
