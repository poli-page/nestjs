# Changelog

All notable changes to `@poli-page/nestjs` are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Breaking:** API keys are `pp_{env}_{32 lowercase hex}` for any environment (`pp_sandbox_…`, `pp_live_…`, `pp_staging_…`). The module no longer rejects a key by prefix: a missing or empty `apiKey` still throws, and any other value that does not match the key format logs one warning at startup (showing at most its `pp_{env}_` part, only when `{env}` is a well-formed environment name, never the secret) and boots, so the API answers with its own error.
- **Breaking:** templates have no versions. Built against the `@poli-page/sdk` that drops `version` from the render input: re-exports `RenderInput` instead of `ProjectModeInput`, and no longer re-exports `InlineModeInput` or `PreviewResult` (`render.preview()` and inline templates are gone; `documents.preview(id)` stays).
- Example app: renders `getting-started/welcome` with no `version`; `GET /errors/bad-version` is replaced by `GET /errors/not-found` (`404 TEMPLATE_NOT_FOUND`), and the `render.preview()` route and dashboard step are removed.

### Fixed

- `PoliPagePdfFile` / `contentDisposition()`: the `Content-Disposition` filename is now escaped per RFC 6266 / RFC 9110 (`\` and `"` as quoted-pairs, ASCII fallback included) and stripped of control characters (CR/LF, TAB, DEL, C1), so a filename can no longer break the header or inject parameters.

## [0.1.0] — 2026-05-26

### Added
- `PoliPageModule.forRoot({ apiKey, ... })` and `PoliPageModule.forRootAsync({ useFactory, useClass, useExisting })` — `@Global()` dynamic module registering a `PoliPage` SDK client.
- `@InjectPoliPage()` decorator (sugar over `@Inject(POLI_PAGE_CLIENT_TOKEN)`).
- `PoliPageService` facade exposing `.client`, `.render`, `.documents`.
- `PoliPagePdfFile` — `StreamableFile` subclass with default PDF headers and RFC 5987 filename encoding. Accepts `Uint8Array`, `Buffer`, Node `Readable`, or Web `ReadableStream<Uint8Array>`.
- `previewResponse()` helper for HTML preview routes.
- `PoliPageExceptionFilter` — `@Catch(PoliPageError)`. Maps 4xx → same, 5xx → same, network/timeout → 502 with `code: 'NETWORK_ERROR'`. Opt-in registration via `registerGlobalExceptionFilter: true` or explicit `app.useGlobalFilters(...)`.
- Synchronous options validation: `apiKey` shape (`pp_test_*` / `pp_live_*`), `timeout` range, `maxRetries` range, `retryDelay` range, `baseUrl` URL parsing.
- `tests/setup.ts` — process-listener snapshot to catch leaks (carries the symfony-bundle and nextjs pattern).
- Example Nest 11 application at `example-app/` covering all 10 SDK demo steps, with an interactive demo dashboard at `GET /` matching the symfony-bundle's aesthetic.
- CI matrix: Node 18 / 20 / 22 × Nest 10 / 11 (6 cells).

### Notes
- `@poli-page/sdk` is a regular dependency at `^1.0.0`.
- Express is the tested platform. `StreamableFile` is platform-agnostic so Fastify "should work" but is not in the CI matrix in v0.1.

[Unreleased]: https://github.com/poli-page/nestjs/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/poli-page/nestjs/releases/tag/v0.1.0
