# Changelog

All notable changes to `@poli-page/nestjs` are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.11.0] - 2026-10-30

First published release. It requires `@poli-page/sdk` `^0.11.0`, hence the version number. The `0.1.0` section that used to sit here was never released; its entries are merged below, and the **Breaking** markers describe changes against that unreleased code.

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
- Contract tests: CI runs the integration cases of the Poli Page API contract (v1.3.0) against the example app, and builds the example app.
- Release workflow: pushing a `vX.Y.Z` tag runs the checks, then publishes to npm with provenance (OIDC Trusted Publishing) after approval on the `npm-publish` environment, and creates the GitHub Release.

### Changed

- **Breaking:** requires `@poli-page/sdk` `^0.11.0` (a regular dependency), the first SDK release with environment keys and no template versions (both changes below).
- **Breaking:** `PoliPageExceptionFilter` is registered globally by default (it was opt-in); `registerGlobalExceptionFilter: false` turns it off. It answers a `PoliPageError` with the SDK's `toPayload()` as the JSON body, `{ code, message, status, requestId }`, and the payload's `status` as the HTTP status: the API's status, `503` for `network_error`, `504` for `timeout`, or `500` for an SDK error with no status (the body keeps `status: null`). `Content-Type` is `application/json`. It removes the PDF headers a route set before the error (`Content-Disposition`, `Content-Length`), destroys the connection when the response has already started, answers through Nest's HTTP adapter (Express and Fastify), and outside HTTP gives the error back: rethrown for GraphQL and WebSockets, passed as is to a microservice transport. A `registerGlobalExceptionFilter` returned by a `forRootAsync` factory is ignored with a warning (it belongs at the top level of the async options).
- `PoliPagePdfFile`: a `PoliPageError` raised by its stream (e.g. `DOWNLOAD_FAILED` from `render.pdfStream()`) before the first byte answers the `toPayload()` JSON without the PDF headers, instead of Nest's `400` text under `application/pdf`; after the first byte the connection is destroyed instead of ended, so a truncated PDF never looks complete.
- **Breaking:** API keys are `pp_{env}_{32 lowercase hex}` for any environment (`pp_sandbox_…`, `pp_live_…`, `pp_staging_…`). The module no longer rejects a key by prefix: a missing, empty or non-string `apiKey` still throws, and any other non-empty string that does not match the key format logs one warning at startup (naming the expected format, showing no part of the key, not even its `pp_{env}_` prefix) and boots, so the API answers with its own error.
- **Breaking:** templates have no versions. `@poli-page/sdk` 0.11.0 drops `version` from the render input: re-exports `RenderInput` instead of `ProjectModeInput`, and no longer re-exports `InlineModeInput` or `PreviewResult` (`render.preview()` and inline templates are gone; `documents.preview(id)` stays).
- Example app: renders `getting-started/welcome` with no `version`; `GET /errors/bad-version` is replaced by `GET /errors/not-found` (`404 TEMPLATE_NOT_FOUND`), and the `render.preview()` route and dashboard step are removed.
- Express is the tested platform; the error handler is also tested on Fastify.

### Removed

- Node 18 from the CI matrix: it is below the `>=20.18.0` engines floor of this package and of `@poli-page/sdk` 0.11.0, whose renders need the global `crypto` (Node 18 fails every render with a `TypeError`).

### Fixed

- `PoliPagePdfFile` / `contentDisposition()`: the `Content-Disposition` filename is now escaped per RFC 6266 / RFC 9110 (`\` and `"` as quoted-pairs, ASCII fallback included) and stripped of control characters (CR/LF, TAB, DEL, C1), so a filename can no longer break the header or inject parameters.

[Unreleased]: https://github.com/poli-page/nestjs/compare/v0.11.0...HEAD
[0.11.0]: https://github.com/poli-page/nestjs/releases/tag/v0.11.0
