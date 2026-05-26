# @poli-page/nestjs

[![CI](https://github.com/poli-page/nestjs/actions/workflows/ci.yml/badge.svg)](https://github.com/poli-page/nestjs/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/%40poli-page%2Fnestjs.svg)](https://www.npmjs.com/package/@poli-page/nestjs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

The official NestJS module for [Poli Page](https://poli.page) — a thin idiomatic veneer over [`@poli-page/sdk`](https://www.npmjs.com/package/@poli-page/sdk) that turns PDF rendering into a one-line controller method. Global module, injectable SDK client, `StreamableFile`-flavoured PDF responses, RFC 5987 filename encoding, and typed `PoliPageError → HTTP` mapping included.

## Install

```bash
npm install @poli-page/nestjs @poli-page/sdk
```

## Quick start

`app.module.ts`:

```ts
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

`invoice.controller.ts`:

```ts
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

`PoliPagePdfFile` defaults `Content-Type: application/pdf`, `Cache-Control: no-store, private`, `X-Content-Type-Options: nosniff`, and RFC 5987-encodes non-ASCII filenames.

## `PoliPageModule.forRootAsync()` with `ConfigService`

```ts
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

`useClass` and `useExisting` patterns are also supported — see the [tests](./tests/unit/poli-page.module.forRootAsync.test.ts) for examples.

## API surface

### `PoliPageService`

The facade your controllers and services depend on. Exposes the underlying SDK client plus its two namespaces as getters.

```ts
constructor(private readonly poliPage: PoliPageService) {}

await this.poliPage.render.pdf(...)        // sugar for service.client.render.pdf
await this.poliPage.documents.get(...)     // sugar for service.client.documents.get
this.poliPage.client                       // the underlying PoliPage instance
```

### `@InjectPoliPage()`

If you'd rather depend on the raw SDK client instead of the facade:

```ts
import { InjectPoliPage } from '@poli-page/nestjs'
import type { PoliPage } from '@poli-page/sdk'

constructor(@InjectPoliPage() private readonly client: PoliPage) {}
```

### `PoliPagePdfFile`

`StreamableFile` subclass with PDF-flavoured defaults. Accepts `Uint8Array`, `Buffer`, Node `Readable`, or Web `ReadableStream<Uint8Array>`.

```ts
new PoliPagePdfFile(bytes, {
  filename: 'invoice.pdf',
  inline: true,                            // attachment when false (default)
  cacheControl: 'public, max-age=60',      // 'no-store, private' by default
})
```

### `previewResponse()`

Plain object with the right `contentType` and `cacheControl` for HTML preview routes. Framework-agnostic — spread it into whatever response shape your handler returns.

```ts
@Get('preview')
@Header('Content-Type', 'text/html; charset=utf-8')
@Header('Cache-Control', 'no-store, private')
async preview(): Promise<string> {
  const result = await this.poliPage.render.preview({ ... })
  return previewResponse(result.html).html
}
```

### `PoliPageExceptionFilter`

`@Catch(PoliPageError)` — narrow on purpose. Maps SDK errors to typed JSON HTTP responses:

| SDK error | HTTP status | Body |
|---|---|---|
| 4xx | same | `{ code, message, requestId }` |
| 5xx | same | `{ code, message, requestId }` |
| `network_error` / `timeout` (no status) | 502 | `{ code: 'NETWORK_ERROR', message, requestId: null }` |

Anything that isn't a `PoliPageError` propagates unchanged to Nest's default exception handler — generic exception swallowing destroys observability.

Two opt-in registration patterns:

```ts
// 1. via the module
PoliPageModule.forRoot({
  apiKey: ...,
  registerGlobalExceptionFilter: true,
})

// 2. explicit, in main.ts
import { PoliPageExceptionFilter } from '@poli-page/nestjs'
app.useGlobalFilters(new PoliPageExceptionFilter())
```

For `forRootAsync`, put `registerGlobalExceptionFilter: true` at the top level of the async options object (next to `useFactory`/`useClass`/`useExisting`), not inside the factory's return value — the flag is read at registration time, before the factory runs.

## Lifecycle hooks

`onRequest`, `onResponse`, `onRetry`, `onError` are passed straight through to the SDK constructor. Bridge them to a Nest `EventEmitter2` (or any observability sink) inside `useFactory`:

```ts
PoliPageModule.forRootAsync({
  inject: [EventEmitter2],
  useFactory: (events: EventEmitter2) => ({
    apiKey: process.env.POLI_PAGE_API_KEY!,
    onRetry: (e) => events.emit('poli-page.retry', e),
    onError: (e) => events.emit('poli-page.error', e),
  }),
})
```

## Example app

A fully working Nest 11 demo lives in [`example-app/`](./example-app/) — nine routes covering every SDK demo step (`render.pdf`, `render.pdfStream`, `render.preview`, `documents.create`, `documents.get` redirect, `documents.preview`, `documents.thumbnails`, `documents.delete`, and an `INVALID_VERSION_FORMAT` triggering route), plus an interactive dashboard at `/` and a standalone `npm run render-to-file` script.

```bash
cd example-app
npm install
npm run start:dev
# → http://localhost:3000
```

## Environment variables

The module itself reads no env vars — your app does, and passes them to `forRoot` / `forRootAsync`. By convention:

| Variable | Notes |
|---|---|
| `POLI_PAGE_API_KEY` | Must start with `pp_test_` or `pp_live_` |
| `POLI_PAGE_BASE_URL` | Set to `https://api-develop.poli.page` for the dev environment |
| `POLI_PAGE_TIMEOUT` | milliseconds — passed to the SDK |
| `POLI_PAGE_MAX_RETRIES` | integer — passed to the SDK |
| `POLI_PAGE_RETRY_DELAY` | milliseconds — passed to the SDK |

Wire whichever you use through `@nestjs/config`'s `ConfigService`, `process.env`, or your own configuration provider.

## Compatibility

| | Range |
|---|---|
| Node | `>=20.18.0` |
| NestJS | `^10 || ^11` — CI matrix covers both |
| Platform | Express (tested); Fastify should work but not in CI for v0.1 |
| Module format | CommonJS |

## Contributing

See [`CLAUDE.md`](./CLAUDE.md) for the day-to-day working agreement: TDD discipline, "fix root causes, never workaround", strict TypeScript, and the rule that the SDK owns HTTP / retry / error mapping.

## License

MIT — see [`LICENSE`](./LICENSE).
