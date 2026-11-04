# @poli-page/nestjs

[![Npm](https://img.shields.io/npm/v/@poli-page/nestjs?style=flat&logo=nodedotjs&logoColor=ffffff&label=Npm)](https://www.npmjs.com/package/@poli-page/nestjs)
[![Downloads](https://img.shields.io/npm/dm/@poli-page/nestjs?style=flat&logo=nodedotjs&logoColor=ffffff&label=Downloads)](https://www.npmjs.com/package/@poli-page/nestjs)
[![Ci](https://img.shields.io/github/actions/workflow/status/poli-page/nestjs/ci.yml?branch=main&style=flat&logo=githubactions&logoColor=ffffff&label=Ci)](https://github.com/poli-page/nestjs/actions/workflows/ci.yml)
[![Codeql](https://img.shields.io/github/actions/workflow/status/poli-page/nestjs/codeql.yml?branch=main&style=flat&logo=github&logoColor=ffffff&label=Codeql)](https://github.com/poli-page/nestjs/actions/workflows/codeql.yml)
[![Coverage](https://img.shields.io/codecov/c/github/poli-page/nestjs/main?style=flat&logo=codecov&logoColor=ffffff&label=Coverage)](https://codecov.io/gh/poli-page/nestjs)
[![Node](https://img.shields.io/node/v/@poli-page/nestjs?style=flat&logo=nodedotjs&logoColor=ffffff&label=Node)](https://nodejs.org/)
[![Nestjs](https://img.shields.io/badge/Nestjs-10%20%7C%2011-blue?style=flat&logo=nestjs&logoColor=ffffff)](https://nestjs.com/)
[![Types](https://img.shields.io/npm/types/@poli-page/nestjs?style=flat&logo=nodedotjs&logoColor=ffffff&label=Types)](https://www.npmjs.com/package/@poli-page/nestjs)
[![Install size](https://img.shields.io/npm/unpacked-size/@poli-page/nestjs?style=flat&logo=nodedotjs&logoColor=ffffff&label=Install%20size)](https://www.npmjs.com/package/@poli-page/nestjs)
[![Deps](https://img.shields.io/badge/Deps-up%20to%20date-brightgreen?style=flat&logo=nodedotjs&logoColor=ffffff)](https://github.com/poli-page/nestjs/network/dependencies)
[![Docs](https://img.shields.io/badge/Docs-online-brightgreen?style=flat&logo=readthedocs&logoColor=ffffff)](https://poli-page.github.io/nestjs/)
[![License](https://img.shields.io/npm/l/@poli-page/nestjs?style=flat&logo=gnu&logoColor=ffffff&label=License)](LICENSE)

> Render Poli Page documents from NestJS controllers.

→ **Documentation**: https://poli-page.github.io/nestjs/

## About

This package wires Poli Page into the Nest DI container. You get a `@Global()` `PoliPageModule` with `forRoot` / `forRootAsync` registration, an injectable `PoliPageService` facade over [`@poli-page/sdk`](https://www.npmjs.com/package/@poli-page/sdk), response types for PDF and HTML preview routes, and an exception filter, registered by default, that answers SDK errors as JSON.

**When to use this:**

- You want `@InjectPoliPage()` or `PoliPageService` available in any controller or provider.
- You want `forRootAsync` integration with `@nestjs/config`'s `ConfigService`.
- You want PDF responses with the correct `Content-Type`, `Cache-Control`, and RFC 5987 filename headers without writing them by hand.

**When not to:**

- You're not on NestJS — use `@poli-page/sdk` directly.
- You need a Fastify-tuned code path; Express is the platform the example app and contract tests use (the error handler is also tested on Fastify).

## Requirements

- Node.js `>=20.18.0`
- NestJS `^10` or `^11`
- [`@poli-page/sdk`](https://www.npmjs.com/package/@poli-page/sdk) `^0.13.0` (installed with the module), the same minor as this package
- `reflect-metadata` `^0.1.13` or `^0.2.0` and `rxjs` `^7.8.0` (Nest peers)
- A Poli Page API key — get one at [poli.page/dashboard](https://poli.page/dashboard)

## Install

```bash
npm install @poli-page/nestjs @poli-page/sdk
```

Set the API key in your environment:

```bash
# .env
POLI_PAGE_API_KEY=pp_sandbox_xxx
```

A key is `pp_{env}_{32 lowercase hex}`, where `{env}` is the environment it belongs to. The key alone selects the environment, so a render never names a version:

| Environment                           | Key            | Watermark | Counted |
| ------------------------------------- | -------------- | --------- | ------- |
| `sandbox` (every org)                 | `pp_sandbox_…` | yes       | no      |
| `live` (every org, deletable on Pro+) | `pp_live_…`    | no        | yes     |
| created on Pro+ (e.g. `staging`)      | `pp_staging_…` | no        | yes     |

"Counted" means the render counts toward the organization's monthly PDF quota.

Nest has no project-level CLI hook, so the smoke test is booting the example app (see [Example app](#example-app)) or running your own `nest start`.

## Quick start

Register the module, then return a PDF from a controller.

```ts
// src/app.module.ts
import { Module } from '@nestjs/common'
import { PoliPageModule } from '@poli-page/nestjs'

@Module({
  imports: [
    PoliPageModule.forRoot({
      apiKey: process.env.POLI_PAGE_API_KEY!,
    }),
  ],
})
export class AppModule {}
```

```ts
// src/invoice.controller.ts
import { Controller, Get, Param } from '@nestjs/common'
import { PoliPageService, PoliPagePdfFile } from '@poli-page/nestjs'

@Controller('invoices')
export class InvoiceController {
  constructor(private readonly poliPage: PoliPageService) {}

  @Get(':id')
  async pdf(@Param('id') id: string): Promise<PoliPagePdfFile> {
    const bytes = await this.poliPage.render.pdf({
      project: 'billing',
      template: 'invoice',
      data: { invoiceId: id },
    })
    return new PoliPagePdfFile(bytes, { filename: `invoice-${id}.pdf` })
  }
}
```

## Configuration

You pass options to `forRoot` (or return them from `forRootAsync`). The module validates them at bootstrap.

| Option | Default | Description |
|---|---|---|
| `apiKey` | — | Required: a missing, empty or non-string value throws. Any other non-empty string is accepted: a key that does not match `pp_{environment}_{32 lowercase hex characters}` logs one warning at startup that names the expected format and shows no part of the key, and the API answers it. |
| `baseUrl` | SDK default | Override the API host. |
| `timeout` | SDK default | Per-request timeout in ms, in `(0, 600_000]`. It also bounds the PDF download: the whole download for `render.pdf`, the wait for each chunk for `render.pdfStream`. A download that outlasts it fails with `DOWNLOAD_FAILED` (no status, so the error handler answers `500`), not `timeout`. |
| `maxRetries` | SDK default | Integer in `[0, 10]`. |
| `retryDelay` | SDK default | Base retry delay in ms, in `[0, 30_000]`. |
| `onRequest` / `onResponse` / `onRetry` / `onError` | — | Lifecycle callbacks passed through to the SDK. |
| `registerGlobalExceptionFilter` | `true` | Registers `PoliPageExceptionFilter` via `APP_FILTER` (see [Error handler](#error-handler)). `false` turns it off. |

### `forRootAsync` with `ConfigService`

```ts
// src/app.module.ts
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { PoliPageModule } from '@poli-page/nestjs'

@Module({
  imports: [
    ConfigModule.forRoot(),
    PoliPageModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        apiKey: config.getOrThrow<string>('POLI_PAGE_API_KEY'),
        baseUrl: config.get<string>('POLI_PAGE_BASE_URL'),
      }),
    }),
  ],
})
export class AppModule {}
```

`useClass` and `useExisting` follow the same `PoliPageOptionsFactory` shape Nest uses elsewhere. To turn the error handler off with `forRootAsync`, put `registerGlobalExceptionFilter: false` at the top level of the async options object, not in the factory's result: the flag is read at registration time, before your factory runs. A factory that returns it gets a startup warning, and the value is ignored.

## API at a glance

| Symbol | Purpose |
|---|---|
| `PoliPageModule` | `@Global()` dynamic module — `forRoot` / `forRootAsync` registration. |
| `PoliPageService` | Injectable facade exposing `.client`, `.render`, `.documents`. |
| `@InjectPoliPage()` | Parameter decorator that injects the raw `PoliPage` SDK client. |
| `POLI_PAGE_CLIENT_TOKEN` | DI token the SDK client is bound to (for custom providers). |
| `PoliPagePdfFile` | `StreamableFile` subclass with PDF defaults and RFC 5987 filenames. |
| `previewResponse()` | Helper returning `{ html, contentType, cacheControl }` for HTML preview routes. |
| `PoliPageExceptionFilter` | `@Catch(PoliPageError)` filter mapping SDK errors to JSON HTTP responses. |

Full reference: [API](https://poli-page.github.io/nestjs/reference/api/) on the documentation site, which covers every export of [`src/index.ts`](src/index.ts). The SDK underneath is documented at [poli-page.github.io/sdk-node](https://poli-page.github.io/sdk-node/).

## Errors

The SDK exposes a single `PoliPageError` class with predicates and codes rather than separate per-category classes:

- **Auth** — `err.isAuthError()` (HTTP 401/403).
- **Rate limit** — `err.isRateLimitError()` (HTTP 429).
- **Request rejected** — render-side validation and processing errors surface with `err.code` values such as `VALIDATION_ERROR`, `TEMPLATE_NOT_FOUND`, `INTERNAL_ERROR`.
- **Network / transport** — `err.isNetworkError()` (`code: 'network_error'` or `'timeout'`, no `status`).
- **Invalid response** — `code: 'invalid_response'`: a 2xx whose body is not JSON, usually from a proxy between the SDK and the API. `err.status` is that 2xx; `toPayload()` answers `502`.
- **File write** — `code: 'io_error'` (no `status`): `renderToFile` cannot write its file.

### Error handler

`PoliPageModule` registers `PoliPageExceptionFilter` as a global filter by default. A `PoliPageError` that leaves a controller answers with the SDK's `err.toPayload()` as the JSON body (`Content-Type: application/json`, `Cache-Control: no-store, private`):

```json
{ "code": "TEMPLATE_NOT_FOUND", "message": "Template 'does-not-exist' not found in project 'getting-started'.", "status": 404, "requestId": "req_…" }
```

| Error | HTTP status | Body `status` |
|---|---|---|
| API error (4xx, 5xx) | the API's status | the API's status |
| `network_error` | `503` | `503` |
| `timeout` | `504` | `504` |
| `invalid_response` | `502` | `502` |
| SDK error with no status (e.g. `aborted`, `io_error`, `DOWNLOAD_FAILED`) | `500` | `null` |

`requestId` is the API's `x-request-id`, or `null` when there is none. The filter is `@Catch(PoliPageError)`: other throws reach Nest's default handler.

- It answers through Nest's HTTP adapter, so it works on Express and Fastify.
- It removes the PDF headers a route set before the error (`@Header('Content-Disposition', …)`, `Content-Length`), so the JSON is never saved as a PDF. If the response has already started, it destroys the connection instead: the body can no longer be replaced.
- Outside HTTP it gives the error back: it rethrows it from GraphQL resolvers and WebSocket gateways, and passes it as is to a microservice transport, in an error `Observable` (the client then receives the serialised `PoliPageError`, not Nest's generic `Internal server error`).
- An error raised by a `render.pdfStream()` stream after the route returned (for example `DOWNLOAD_FAILED`) never reaches exception filters. The answer is the same: before the first byte, the `toPayload()` JSON without the PDF headers; after it, the connection is destroyed, so a truncated PDF never looks complete. On Express `PoliPagePdfFile` answers it itself; on Fastify the stream error reaches the global filter, which answers it.

To handle the errors yourself, turn it off:

```ts
PoliPageModule.forRoot({
  apiKey: process.env.POLI_PAGE_API_KEY!,
  registerGlobalExceptionFilter: false,
})
```

You can then catch them in a controller, or register the filter on a narrower scope with `@UseFilters(PoliPageExceptionFilter)`:

```ts
// src/invoice.controller.ts
import { PoliPageError } from '@poli-page/sdk'

try {
  await this.poliPage.render.pdf(input)
} catch (err) {
  if (err instanceof PoliPageError) {
    if (err.isAuthError())      throw new UnauthorizedException()
    if (err.isRateLimitError()) throw new HttpException('Slow down', 429)
    if (err.isNetworkError())   throw new HttpException('Upstream unreachable', 503)
  }
  throw err
}
```

## Example app

A NestJS 11 app at [`example-app/`](./example-app/) covers the full SDK surface: `render.pdf`, `render.pdfStream`, `render.document`, `documents.get` redirect, `documents.preview`, `documents.thumbnails`, `documents.delete`, plus a standalone `render-to-file` script. The successful render routes and the script use the `getting-started` project's `welcome` template, which every organization has in `sandbox`. `GET /errors/not-found` renders the template `does-not-exist` and answers `404` with code `TEMPLATE_NOT_FOUND`, showing the error's `code`, `status`, `message` and `requestId` through `PoliPageExceptionFilter`. A demo dashboard at `/` exercises each route interactively.

The app reads `POLI_PAGE_API_KEY` (a `pp_sandbox_…` key) and, optionally, `POLI_PAGE_BASE_URL`.

```bash
cd example-app
npm install
npm run start:dev
# http://localhost:3000
```

## Going further

The [documentation site](https://poli-page.github.io/nestjs/) goes into each topic in depth:

- [Configuration](https://poli-page.github.io/nestjs/concepts/configuration/): `forRoot`, and the `forRootAsync` patterns (`useFactory`, `useClass`, `useExisting`).
- [Errors](https://poli-page.github.io/nestjs/production/errors/): how `PoliPageExceptionFilter` maps each error category to HTTP.
- [Responses](https://poli-page.github.io/nestjs/concepts/responses/): PDFs, `render.pdfStream` results through `PoliPagePdfFile`, HTML previews and document redirects.
- [Observability](https://poli-page.github.io/nestjs/production/observability/): the `onRequest` / `onResponse` / `onRetry` / `onError` callbacks.
- [Testing](https://poli-page.github.io/nestjs/production/testing/): overriding the client in `Test.createTestingModule()`.

## Compatibility

| Package | `@poli-page/sdk` | NestJS | Node |
|---|---|---|---|
| `0.13.x` | `0.13.x` | `^10` or `^11` | `>=20.18.0` |

Express is the tested platform. The error handler is also tested on Fastify; the rest of the package (`StreamableFile` is platform-agnostic) is expected to work there but is not covered by tests in `0.13`. New NestJS majors land within one minor of upstream release.

## Contributing

`npm run typecheck`, `npm run lint`, `npm run test:coverage` (the test suite with a coverage report, uploaded to Codecov) and `npm run build` are what CI runs. CodeQL scans the code on every push and pull request to `main`, and weekly.

The documentation site lives in [`docs/`](docs/), an Astro Starlight site on the shared Poli Page docs preset (vendored in `docs/src/preset/`). Build it with `npm ci && npm run build` in `docs/`: the build fails when a page is missing or breaks the page rules. The Docs workflow deploys it to GitHub Pages when a push to `main` changes it.

Releases are cut by pushing a `vX.Y.Z` tag; see [RELEASING.md](RELEASING.md).

### Contract tests

`tests/contract/contract.test.ts` runs the integration cases (`impl.*`) of the [Poli Page API contract](https://github.com/poli-page/api-contract) against the example app, with its SDK pointed at a local mock API. CI runs them against the contract version pinned in `.github/workflows/ci.yml`. Locally, they are skipped unless you point `POLI_CONTRACT` at a `contract.json`:

```bash
POLI_CONTRACT=/path/to/contract.json npm test
```

`tests/contract-skip.json` lists the cases allowed to fail, each with its reason.

## License

MIT — see [LICENSE](LICENSE).
