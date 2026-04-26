# @poli-page/nestjs

NestJS module for [Poli Page](https://poli.page) — generate PDFs from any Nest service or controller with idiomatic dependency injection.

> **Status**: scaffold only. Implementation begins in P0.3 of the [SDK roadmap](https://github.com/poli-page/poli-page/blob/develop/docs/onboarding/micka/sdk-roadmap.md).

## Install

```bash
npm install @poli-page/nestjs @poli-page/sdk
```

## Quick start

To be filled in as the integration is built. The package will expose `PoliPageModule.forRoot({ apiKey: ... })` (and `forRootAsync`) plus an injectable `PoliPageService` consuming the core SDK.

## Dependencies

This package wraps [`@poli-page/sdk`](https://github.com/poli-page/sdk-node) and lists it as a peer/runtime dependency. All HTTP, retry, and error-handling logic lives in the core SDK — this repo only provides the Nest module, providers, and configuration.

## Publishing

Published to **npm** as [`@poli-page/nestjs`](https://www.npmjs.com/package/@poli-page/nestjs).

## Documentation

Full Poli Page documentation is at [docs.poli.page](https://docs.poli.page).

## License

MIT — see [LICENSE](./LICENSE).
