# CLAUDE.md

> Instructions for Claude Code agents working in `poli-page/nestjs`.

## 1. Repo at a glance

| Field        | Value |
| ------------ | ----- |
| Repository   | `poli-page/nestjs` |
| Type         | Framework integration (NestJS dynamic module) |
| Language     | TypeScript (ES2022, strict) |
| Node         | `>=20.18.0` (matches `@poli-page/sdk`) |
| NestJS       | `^10 || ^11` (peer); CI matrix covers both |
| Registry     | npm — `@poli-page/nestjs` |
| Depends on   | `@poli-page/sdk` (npm, `^1.0.0`) |
| Roadmap slot | P0.3 |

**Source-of-truth docs (read first):**
- `docs/spec/nestjs-implementation.md` — full design spec for v0.1.0
- `docs/plan/2026-05-26-implementation.md` — step-by-step implementation plan
- `/Users/mickael/Projects/INTEGRATIONS_PLAN.md` — cross-repo umbrella note, esp. §"Cross-cutting DX patterns"
- `/Users/mickael/Projects/nextjs/CLAUDE.md` and its spec — most recent sibling integration (same SDK, different idiom). Reuse decisions where applicable.
- `/Users/mickael/Projects/symfony-bundle/docs/spec/bundle-specification.md` — Nest's DI/module shape maps better to a Symfony bundle than to Next's stateless functions. Use it for module & configuration design.

## 2. The package's job

This package is a **thin NestJS-flavored wrapper** around the official Poli Page Node SDK (`@poli-page/sdk`, source at `/Users/mickael/Projects/sdk-node/`). It provides:

- A `PoliPageModule` with `forRoot({ apiKey, ... })` and `forRootAsync({ useFactory, inject, imports })` registration patterns. `@Global()` — consumers import once.
- An `@InjectPoliPage()` decorator (sugar for `@Inject(POLI_PAGE_CLIENT_TOKEN)`).
- A `PoliPageService` — thin facade exposing `client`, `render`, `documents` accessors so users can choose between `service.render.pdf(...)` and `service.client.render.pdf(...)`.
- A global `PoliPageExceptionFilter` (`@Catch(PoliPageError)`) mapping SDK errors to typed HTTP responses (4xx → same status, 5xx → same, network/timeout → 502).
- Response helpers: a `PoliPagePdfFile` (subclass of `StreamableFile` from `@nestjs/common`) for PDF streaming with the right headers, plus a small `previewResponse()` helper for HTML previews.
- An example Nest app at `example-app/` with the interactive demo UI served at `GET /`.

**This package does NOT** reimplement HTTP transport, retries, error classification, idempotency keys, stream chunking, or anything else the SDK already does. Bug in those areas? Fix it in `sdk-node`, not here.

**This package does NOT** ship: a `@nestjs/cli` plugin, a Fastify-specific code path (Express is the default and what we test; Fastify is "should work" but not in the CI matrix), an OpenAPI/Swagger integration (defer to v0.2), or a CLI beyond `nest` itself.

## 3. Working language

- **Code, comments, file names, commit messages, PR descriptions, repository documentation**: English.
- **Day-to-day conversation with Mickael/Xavier**: French, tutoiement.
- **Conversation in this Claude Code session**: French is fine for the chat; artifacts stay English.

## 4. TDD is mandatory

RED → GREEN → refactor for every change. Tests live in `tests/unit/` (mocked SDK, ~90% of the suite) and `tests/integration/` (one happy-path test against `api-develop.poli.page`, gated on `POLI_PAGE_API_KEY`).

### What to test (integration-specific!)

- **Module compilation**: `PoliPageModule.forRoot({...})` and `forRootAsync({...})` both produce a module that resolves `POLI_PAGE_CLIENT_TOKEN` to a real `PoliPage` instance.
- **`@InjectPoliPage()`**: a decorated constructor parameter is satisfied by the module-provided client.
- **Configuration validation**: missing `apiKey`, wrong prefix (must be `pp_test_*` or `pp_live_*`), bad `timeout`, bad `retries.*` throw with the documented message at module bootstrap.
- **`PoliPageExceptionFilter`**: `PoliPageError` with status 4xx/5xx maps to same-status JSON; network/timeout (`code: 'network_error' | 'timeout'`, no status) maps to 502 with `code: 'NETWORK_ERROR'`. Non-`PoliPageError` throws bubble unchanged.
- **`PoliPagePdfFile`**: defaults `Content-Type: application/pdf`, `Cache-Control: no-store, private`, `X-Content-Type-Options: nosniff`, RFC 5987 filename encoding (ASCII + non-ASCII).
- **`previewResponse()`**: `text/html; charset=utf-8`, `no-store, private`.
- **`PoliPageService` facade**: passthrough delegation (no behavioural divergence from the raw client).

### What NOT to test (the SDK already does)

- HTTP transport behaviour (Undici / fetch edge cases).
- Retry policy (backoff, max attempts, `Retry-After`, never-retry-4xx).
- 4xx / 5xx → `PoliPageError` mapping inside the SDK.
- Idempotency-Key generation.
- Stream chunking correctness.
- API contract drift — the SDK's contract tests own that.

Re-testing these here doubles maintenance burden. **If you find yourself writing a mock HTTP server, stop — you're doing the SDK's job.**

## 5. Robustness over shortcuts

Mickael's hard rule: **no hacks to make a test pass or a corner case go away**. Fix root causes. If a workaround is genuinely required (framework bug, SDK quirk), document it inline with a `// Why:` comment naming the constraint.

Concretely: don't disable strict ESLint/TypeScript rules, don't `// @ts-expect-error` away type errors, don't widen types to silence them, don't expand the `PoliPageExceptionFilter` catch scope to swallow generic errors.

## 6. Code conventions

- **TypeScript strict mode** + `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`. Configured in `tsconfig.json`.
- **ESLint flat config** mirroring `sdk-node`'s, minus the Edge restrictions (Nest is server-only Node — `Buffer`, `node:*` are fine here; see §10.2 of the spec for the delta).
- **No commented-out code, no `TODO` without a linked issue, no debug prints.**
- **Default to no comments.** Add one only when the *why* is non-obvious. Comments restating *what* the code does are noise.
- **Named exports only** (no `export default`). Public functions use `export function ...` so they appear cleanly in stack traces and intellisense.

## 7. Commits and PRs

- **Conventional Commits**: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
- **One concern per PR**, reviewable in under 30 minutes.
- PR description: what changed, why, how it was tested.
- CI must be green before merge.

## 8. CI

Workflow: `.github/workflows/ci.yml`. Matrix: Node `18` / `20` / `22` × Nest `10` / `11`. Each step auto-skips if the relevant config file is missing (so a freshly scaffolded repo is green from day one). Don't change that behaviour.

Local mirror:
```bash
npm ci
npm run typecheck
npm run lint
npm test            # Jest
npm run build       # nest build (tsc); verify dist/ shape
```

## 9. Unpublished-SDK / workspace note

`@poli-page/sdk` is **already published** on npm (`^1.0.0`), so for normal dev you just `npm install`. When testing against unreleased SDK changes, use either:

1. **npm workspaces** — declare `sdk-node` and `nestjs` as workspaces under a root `package.json` at `/Users/mickael/Projects/`. `npm install` resolves to the local checkout; nothing changes in this repo's manifest.
2. **`npm link`** (fallback when the workspace root isn't set up):
   ```bash
   cd /Users/mickael/Projects/sdk-node && npm link
   cd /Users/mickael/Projects/nestjs   && npm link @poli-page/sdk
   ```

Either way, the integration's published `package.json` stays clean (`"@poli-page/sdk": "^1.0.0"`).

## 10. Known gotchas (battle-tested — don't relearn the hard way)

### 10.1 Jest `process` listener leaks

Strict Jest configs (and our `tests/setup.ts`) flag tests that leave dangling `process.on('unhandledRejection')` or `process.on('uncaughtException')` listeners. Nest's `INestApplication` lifecycle and Nest's logger can both register these.

**Fix in place** (carry from symfony-bundle's `RestoresGlobalHandlers` trait and nextjs's `tests/setup.ts`): a `setupFilesAfterEach` snapshots `process.listeners('unhandledRejection')` / `process.listeners('uncaughtException')` at file load and restores them after each test. Apply globally via `jest.config.ts`.

**Do NOT** disable the check globally. Same rule as symfony-bundle §10.1 and nextjs §10.1.

### 10.2 Nest is server-only — no Edge ban

Unlike `@poli-page/nextjs`, this package runs only under Node. `Buffer`, `node:fs`, `node:stream`, `process.nextTick` are all fine. The ESLint config does NOT ban them. Don't copy `nextjs`'s `no-restricted-imports` list — it's irrelevant here and would block legitimate `StreamableFile` plumbing.

### 10.3 `PoliPageExceptionFilter` only catches `PoliPageError`

The global filter is `@Catch(PoliPageError)` — narrow on purpose. Any other throw bubbles up to Nest's global `HttpException` filter (or the framework default 500). This matches the nextjs spec §10 and the symfony-bundle's "exceptions propagate" choice. **Do NOT** widen to `@Catch()` (catches everything) — generic exception swallowing destroys observability.

### 10.4 No CLI beyond `nest` itself

Nest has no per-app `artisan`/`bin/console`/`manage.py`-style command entry point that user code attaches to. The example app's `npm run start:dev` IS the smoke test. The SDK's `renderToFile` helper becomes a standalone script at `example-app/scripts/render-to-file.ts` (run via `tsx`), not a Nest command. Don't try to invent a CLI here.

### 10.5 Single root `.env`, no per-app `.env.local`

The example app's `main.ts` reads the workspace root `.env` (`/Users/mickael/Projects/.env`) at bootstrap and pushes values into `process.env` only when not already set. Real shell exports always win.

**Do NOT** introduce a `.env.local` in `example-app/` or instruct users to `cp .env .env.local`. This was an explicit hard requirement from Mickael during the symfony-bundle session. See `INTEGRATIONS_PLAN.md` §"Cross-cutting DX patterns" §2.

### 10.6 The interactive demo UI is mandatory, not optional

`GET /` in the example app returns a single-page HTML dashboard with one button per SDK feature, inline `<iframe>` previews, JSON pretty-print, and a document-lifecycle state machine in client JS. Aesthetic copied from `/Users/mickael/Projects/symfony-bundle/example-app/templates/demo.html` (white surface, indigo `#4f5d99`, Manrope + IBM Plex Sans + JetBrains Mono). Implemented as a plain string returned from a `DemoController` — no template engine dependency. See `INTEGRATIONS_PLAN.md` §"Cross-cutting DX patterns" §1 for the bar.

### 10.7 Jest, not Vitest

Nest's default test runner is Jest, and the broader ecosystem (Nest CLI's `--test`, `@nestjs/testing`, every published Nest module) assumes it. **Do NOT** swap to Vitest "because nextjs uses it" — that's a deviation Mickael hasn't approved. See spec §14.1.

### 10.8 `@poli-page/sdk` ships dual CJS+ESM — Node subpath requires `module: Node16`

`@poli-page/sdk` exposes a `./node` subpath (`@poli-page/sdk/node`) for Node-only helpers like `renderToFile`. The SDK's `package.json` declares it via an `exports` map with `import` / `require` conditions. The legacy `module: "CommonJS"` + `moduleResolution: "Node"` pair in TypeScript **does not honor `exports` maps** — so `import { renderToFile } from '@poli-page/sdk/node'` errors out with TS2307 "Cannot find module" under the legacy resolver, even when the runtime path resolves fine.

**Fix** (applied in `example-app/tsconfig.json`): `"module": "Node16"` + `"moduleResolution": "Node16"`. This still emits CJS (the example app's `package.json` has no `"type": "module"`), so the runtime output is unchanged — only the type-resolution path is upgraded to read `exports` correctly.

Secondary symptom: the SDK ships dual CJS+ESM declaration files, and `@poli-page/nestjs` types `PoliPage` against the **require-mode** `.d.ts` while `@poli-page/sdk/node`'s `renderToFile(client, ...)` signature references the **import-mode** declaration. They're the same class at runtime; TypeScript sees two nominally distinct types. Use one `as unknown as` cast at the call site with a `// Why:` comment naming the dual-package mismatch — fixing this in the SDK is the right long-term path, but the cast is the correct local workaround. **Do NOT** widen `PoliPageService.client`'s return type to `any` or to a hand-rolled union; that hides the root cause and breaks intellisense for every caller.

## 11. When stuck

- Re-read `docs/spec/nestjs-implementation.md` first; most "open questions" are answered there or in §18 "Resolved decisions".
- Compare with `sdk-node` at `/Users/mickael/Projects/sdk-node/`.
- Compare with `@poli-page/nextjs` (same SDK, different framework) at `/Users/mickael/Projects/nextjs/`.
- Compare with the symfony-bundle (same DI shape, different language) at `/Users/mickael/Projects/symfony-bundle/`.
- Look at industry benchmarks: `@sentry/nestjs`, `@nestjs/jwt`, `@nestjs/bull`, `@nestjs/typeorm`, `@nestjs/swagger`. Their `forRoot` / `forRootAsync` patterns are the bar.
- Ask Mickael early. A two-line message is faster than a half-day rebuilding the wrong thing.
- If a CI failure looks unrelated to your change, check `main` first before assuming you caused it.
