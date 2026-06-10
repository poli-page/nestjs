# @poli-page/nestjs

> Render Poli Page documents from NestJS controllers.

## About

This package wires Poli Page into the Nest DI container. You get a `@Global()` `PoliPageModule` with `forRoot` / `forRootAsync` registration, an injectable `PoliPageService` facade over [`@poli-page/sdk`](https://www.npmjs.com/package/@poli-page/sdk), response types for PDF and HTML preview routes, and an opt-in exception filter that maps SDK errors to typed HTTP responses.

**When to use this:**

- You want `@InjectPoliPage()` or `PoliPageService` available in any controller or provider.
- You want `forRootAsync` integration with `@nestjs/config`'s `ConfigService`.
- You want PDF responses with the correct `Content-Type`, `Cache-Control`, and RFC 5987 filename headers without writing them by hand.

**When not to:**

- You're not on NestJS — use `@poli-page/sdk` directly.
- You need a Fastify-tuned code path; Express is the platform we test, Fastify is unverified.

## Requirements

- Node.js `>=20.18.0`
- NestJS `^10` or `^11`
- `reflect-metadata` `^0.1.13` or `^0.2.0` and `rxjs` `^7.8.0` (Nest peers)
- A Poli Page API key — get one at [poli.page/dashboard](https://poli.page/dashboard)

## Install

```bash
npm install @poli-page/nestjs @poli-page/sdk
```

Set the API key in your environment:

```bash
# .env
POLI_PAGE_API_KEY=pp_test_xxx
```

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
      version: '1.0.0',
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
| `apiKey` | — | Required. Must start with `pp_test_` or `pp_live_`. |
| `baseUrl` | SDK default | Override the API host. |
| `timeout` | SDK default | Per-request timeout in ms, in `(0, 600_000]`. |
| `maxRetries` | SDK default | Integer in `[0, 10]`. |
| `retryDelay` | SDK default | Base retry delay in ms, in `[0, 30_000]`. |
| `onRequest` / `onResponse` / `onRetry` / `onError` | — | Lifecycle callbacks passed through to the SDK. |
| `registerGlobalExceptionFilter` | `false` | When `true`, registers `PoliPageExceptionFilter` via `APP_FILTER`. |

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
      registerGlobalExceptionFilter: true,
    }),
  ],
})
export class AppModule {}
```

`useClass` and `useExisting` follow the same `PoliPageOptionsFactory` shape Nest uses elsewhere. Put `registerGlobalExceptionFilter` at the top level of the async options object — the flag is read at registration time, before your factory runs.

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

Full reference: [docs/api.md](docs/api.md).

## Errors

The SDK exposes a single `PoliPageError` class with predicates and codes rather than separate per-category classes. The taxonomy below maps to the predicates `PoliPageError` already provides:

- **Auth** — `err.isAuthError()` (HTTP 401/403).
- **Rate limit** — `err.isRateLimitError()` (HTTP 429).
- **Request rejected** — render-side validation and processing errors surface with `err.code` values such as `VALIDATION_ERROR`, `INVALID_VERSION_FORMAT`, `INTERNAL_ERROR`.
- **Network / transport** — `err.isNetworkError()` (`code: 'network_error'` or `'timeout'`, no `status`).

Handle them in a controller:

```ts
// src/invoice.controller.ts
import { PoliPageError } from '@poli-page/sdk'

try {
  await this.poliPage.render.pdf(input)
} catch (err) {
  if (err instanceof PoliPageError) {
    if (err.isAuthError())      throw new UnauthorizedException()
    if (err.isRateLimitError()) throw new HttpException('Slow down', 429)
    if (err.isNetworkError())   throw new HttpException('Upstream unreachable', 502)
  }
  throw err
}
```

Or register `PoliPageExceptionFilter` once and skip the boilerplate — 4xx/5xx pass through unchanged and network/timeout becomes a 502 with `code: 'NETWORK_ERROR'`. The filter is `@Catch(PoliPageError)` on purpose; other throws propagate to Nest's default handler.

## Example app

A NestJS 11 app at [`example-app/`](./example-app/) covers the full SDK surface: `render.pdf`, `render.pdfStream`, `render.preview`, `documents.create`, `documents.get` redirect, `documents.preview`, `documents.thumbnails`, `documents.delete`, plus a route that triggers `INVALID_VERSION_FORMAT` and a standalone `render-to-file` script. A demo dashboard at `/` exercises each route interactively.

```bash
cd example-app
npm install
npm run start:dev
# http://localhost:3000
```

## Going further

- [docs/api.md](docs/api.md) — Full API reference for every exported symbol.
- [docs/configuration.md](docs/configuration.md) — `forRootAsync` patterns (`useFactory`, `useClass`, `useExisting`) in depth.
- [docs/exception-filter.md](docs/exception-filter.md) — How `PoliPageExceptionFilter` maps each error category to HTTP.
- [docs/streaming.md](docs/streaming.md) — Returning `render.pdfStream` results through `PoliPagePdfFile`.
- [docs/events.md](docs/events.md) — Bridging `onRequest` / `onResponse` / `onRetry` / `onError` to `EventEmitter2`.
- [docs/testing.md](docs/testing.md) — Overriding the client in `Test.createTestingModule()`.

These topic files are forthcoming; until they land, the source under `src/` and the example app are the reference.

## Compatibility

| Package | NestJS | Node |
|---|---|---|
| `0.1.x` | `^10` or `^11` | `>=20.18.0` |

Express is the tested platform. `StreamableFile` is platform-agnostic, so Fastify is expected to work but is not in the CI matrix for `0.1`. New NestJS majors land within one minor of upstream release.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
