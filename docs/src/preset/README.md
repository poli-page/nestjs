# Vendored Starlight preset

The files in this directory are vendored from the reference repo `sdk-docs-preset`, at commit `b1ae69b` (`b1ae69b069fd21071062085a40ff93662fca87d2`). They define the shared sidebar, theme, lint plugins, and Astro components used by every Poli Page SDK and integration doc site. This site uses the preset's **integration profile** (`profile: 'integration'` in `astro.config.mjs`).

**This is a copy, not a dependency.** The site does not depend on any npm package named `@poli-page/starlight-preset`. Imports use the local alias `@preset` (configured in `astro.config.mjs` and `tsconfig.json`).

## Updating

When the upstream preset changes:

1. In `sdk-docs-preset/`, check out the new commit and run `npm ci && npm run build` (`dist/` is not committed there) and `npm test`.
2. Sync the files into `docs/src/preset/`. The mapping is:

| Source (`sdk-docs-preset/`)   | Destination (`docs/src/preset/`) |
|-------------------------------|----------------------------------|
| `dist/*.js`                   | (flat)                           |
| `dist/remark/*.js`            | `remark/`                        |
| `dist/canonical-*.json`       | (flat)                           |
| `src/components/*.astro`      | `components/`                    |
| `src/styles/poli-page.css`    | `styles/`                        |

3. Make the two local edits below again.
4. Update the commit above, then run `npm run build` in `docs/` to verify nothing regressed.

## Local edits

The copy differs from upstream `dist/` in two ways:

- `theme.js`: `POLI_PAGE_CSS_PATH` is `'@preset/styles/poli-page.css'` instead of `'@poli-page/starlight-preset/styles/poli-page.css'`, so the CSS resolves through the local alias. Every SDK site makes the same edit.
- Every `.js` file has its trailing `//# sourceMappingURL=…` line removed. The `.map` files and the TypeScript sources are not vendored, so the line only made `astro build` print a "Failed to load source map" error per file.

## What is NOT vendored

- TypeScript source files (`src/*.ts`), declarations (`*.d.ts`) and source maps (`*.map`): the compiled `dist/*.js` is enough for the docs build.
- `templates/*.mdx`: not used by this site.
- The `poli-docs-scaffold` CLI (`dist/bin/`): not invoked at site-build time.
