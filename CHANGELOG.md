# Changelog

All notable changes to `@poli-page/nestjs` are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Support for NestJS 12. The `@nestjs/common` and `@nestjs/core` peer ranges are now `^10.0.0 || ^11.0.0 || ^12.0.0`. NestJS 12 is ESM-only; this package stays CommonJS and loads it through Node's `require()` of ES modules.

### Changed

- **Breaking:** the minimum Node.js version is now 22.12.0 (was 20.18.0). Node 20 reached end of life on 2026-04-30, and Vitest 5 needs Node 22.12 or later. Node 22.12 also loads ES modules with `require()` without a flag, which NestJS 12 needs. CI no longer tests Node 20.
- The tests run on Vitest 5 with `unplugin-swc` (SWC emits the decorator metadata Nest reads) instead of Jest with `ts-jest`, which cannot load NestJS 12. No effect on the published package.

## [0.13.0] - 2026-11-04

First release on npm. It requires `@poli-page/sdk` 0.13 and passes the Poli Page API contract v0.13.0. The package shares its major.minor with the Poli Page API, so its first version is 0.13.0; a 0.11.0 was prepared and never published, and neither was the 0.1.0 development line. The **Breaking** markers describe changes against that unreleased code.

### Added

- `PoliPageModule.forRoot({ apiKey, ... })` and `PoliPageModule.forRootAsync({ useFactory, useClass, useExisting })`: a `@Global()` dynamic module registering a `PoliPage` SDK client.
- `@InjectPoliPage()` decorator (sugar over `@Inject(POLI_PAGE_CLIENT_TOKEN)`).
- `PoliPageService` facade exposing `.client`, `.render`, `.documents`.
- `PoliPagePdfFile`: a `StreamableFile` subclass with default PDF headers and RFC 5987 filename encoding. Accepts `Uint8Array`, `Buffer`, Node `Readable`, or Web `ReadableStream<Uint8Array>`.
- `previewResponse()` helper for HTML preview routes.
- `PoliPageExceptionFilter`: `@Catch(PoliPageError)`, answering SDK errors as JSON (registration and mapping under Changed).
- Synchronous options validation: `apiKey` presence (format under Changed), `timeout` range, `maxRetries` range, `retryDelay` range, `baseUrl` URL parsing.
- `tests/setup.ts`: a process-listener snapshot to catch leaks.
- Example Nest 11 application at `example-app/` covering the SDK surface, with an interactive demo dashboard at `GET /`.
- CI matrix: Node 20 / 22 × Nest 10 / 11 (4 cells).
- Contract tests: CI runs the integration cases of the Poli Page API contract v0.13.0 (`poli-page/api-contract`), including `impl.invalid-response`, against the example app, and builds the example app.
- Release workflow: pushing a `vX.Y.Z` tag runs the checks, then publishes to npm with provenance (OIDC Trusted Publishing) after approval on the `npm-publish` environment, and creates the GitHub Release. A version already on npm is skipped only when npm's `gitHead` for it is the tagged commit; otherwise `verify` and `publish` fail instead of creating a GitHub Release for code that is not on npm.
- Release workflow: the tag's major.minor must be the pinned API contract's (a stable contract tag on the pinned commit, not the comment next to it; `release.yml` must pin the same commit as `ci.yml`) and the required `@poli-page/sdk`'s (`scripts/check-release-versions.sh`); the error names both versions.

### Changed

- **Breaking:** requires `@poli-page/sdk` `^0.13.0` (`>=0.13.0 <0.14.0`, a regular dependency), with environment keys and no template versions (both changes below). With it, a 2xx from the API whose body is not JSON (usually from a proxy) raises `PoliPageError` with code `invalid_response`, which the exception filter answers `502` (the error's own `status` keeps the 2xx); a `renderToFile()` that cannot write its file raises `io_error`, answered `500` with `"status": null`; and the PDF download is bounded by the `timeout` option (the whole download for `render.pdf`, an idle timeout for `render.pdfStream`), failing with `DOWNLOAD_FAILED`.
- **Breaking:** `PoliPageExceptionFilter` is registered globally by default (it was opt-in); `registerGlobalExceptionFilter: false` turns it off. It answers a `PoliPageError` with the SDK's `toPayload()` as the JSON body, `{ code, message, status, requestId }`, and the payload's `status` as the HTTP status: the API's status, `503` for `network_error`, `504` for `timeout`, `502` for `invalid_response`, or `500` for an SDK error with no status (the body keeps `status: null`). `Content-Type` is `application/json`. It removes the PDF headers a route set before the error (`Content-Disposition`, `Content-Length`), destroys the connection when the response has already started, answers through Nest's HTTP adapter (Express and Fastify), and outside HTTP gives the error back: rethrown for GraphQL and WebSockets, passed as is to a microservice transport. A `registerGlobalExceptionFilter` returned by a `forRootAsync` factory is ignored with a warning (it belongs at the top level of the async options).
- `PoliPagePdfFile`: a `PoliPageError` raised by its stream (e.g. `DOWNLOAD_FAILED` from `render.pdfStream()`) before the first byte answers the `toPayload()` JSON without the PDF headers, instead of Nest's `400` text under `application/pdf`; after the first byte the connection is destroyed instead of ended, so a truncated PDF never looks complete.
- **Breaking:** API keys are `pp_{env}_{32 lowercase hex}` for any environment (`pp_sandbox_…`, `pp_live_…`, `pp_staging_…`). The module no longer rejects a key by prefix: a missing, empty or non-string `apiKey` still throws, and any other non-empty string that does not match the key format logs one warning at startup (naming the expected format, showing no part of the key, not even its `pp_{env}_` prefix) and boots, so the API answers with its own error.
- **Breaking:** templates have no versions. `@poli-page/sdk` drops `version` from the render input: re-exports `RenderInput` instead of `ProjectModeInput`, and no longer re-exports `InlineModeInput` or `PreviewResult` (`render.preview()` and inline templates are gone; `documents.preview(id)` stays).
- Example app: renders `getting-started/welcome` with no `version`; `GET /errors/bad-version` is replaced by `GET /errors/not-found` (`404 TEMPLATE_NOT_FOUND`), and the `render.preview()` route and dashboard step are removed.
- Express is the tested platform; the error handler is also tested on Fastify.

### Removed

- Node 18 from the CI matrix: it is below the `>=20.18.0` engines floor of this package and of `@poli-page/sdk`, whose renders need the global `crypto` (Node 18 fails every render with a `TypeError`).

### Fixed

- `PoliPagePdfFile` / `contentDisposition()`: the `Content-Disposition` filename is now escaped per RFC 6266 / RFC 9110 (`\` and `"` as quoted-pairs, ASCII fallback included) and stripped of control characters (CR/LF, TAB, DEL, C1), so a filename can no longer break the header or inject parameters.

[Unreleased]: https://github.com/poli-page/nestjs/compare/v0.13.0...HEAD
[0.13.0]: https://github.com/poli-page/nestjs/releases/tag/v0.13.0
