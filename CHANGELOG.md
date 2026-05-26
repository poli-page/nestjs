# Changelog

All notable changes to `@poli-page/nestjs` are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
