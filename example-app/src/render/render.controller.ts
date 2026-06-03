import { statSync } from 'node:fs'
import { resolve } from 'node:path'
import { Controller, Get, Header, Post, Query } from '@nestjs/common'
import {
  PoliPageService,
  PoliPagePdfFile,
  previewResponse,
} from '@poli-page/nestjs'
import { renderToFile } from '@poli-page/sdk/node'

@Controller('render')
export class RenderController {
  constructor(private readonly poliPage: PoliPageService) {}

  @Get('pdf')
  @Header('Cache-Control', 'no-store, private')
  @Header('X-Content-Type-Options', 'nosniff')
  async pdf(): Promise<PoliPagePdfFile> {
    const bytes = await this.poliPage.render.pdf({
      project: 'getting-started',
      template: 'welcome',
      version: '1.0.0',
      data: { name: 'World' },
    })
    return new PoliPagePdfFile(bytes, { filename: 'welcome.pdf', inline: true })
  }

  @Get('stream')
  @Header('Cache-Control', 'no-store, private')
  @Header('X-Content-Type-Options', 'nosniff')
  async stream(): Promise<PoliPagePdfFile> {
    const stream = await this.poliPage.render.pdfStream({
      project: 'getting-started',
      template: 'welcome',
      version: '1.0.0',
      data: { name: 'World' },
    })
    return new PoliPagePdfFile(stream, { filename: 'welcome.pdf', inline: true })
  }

  @Post('file')
  async file(): Promise<{ path: string; sizeBytes: number }> {
    // Why: compiled to dist/src/render/render.controller.js — climb four levels
    // (render → src → dist → example-app) to land at the project root.
    const output = resolve(__dirname, '../../../../output/welcome.pdf')
    // Why: the SDK ships dual builds (CJS + ESM). With moduleResolution=Node16,
    // `@poli-page/sdk/node` resolves to the import-mode declaration while
    // `@poli-page/nestjs` (and its `PoliPage` type) resolves through the
    // require-mode one. Both classes are runtime-identical; the cast bridges
    // the declaration mismatch without touching the SDK.
    await renderToFile(
      this.poliPage.client as unknown as Parameters<typeof renderToFile>[0],
      {
        project: 'getting-started',
        template: 'welcome',
        version: '1.0.0',
        data: { name: 'renderToFile demo' },
      },
      output,
    )
    return { path: output, sizeBytes: statSync(output).size }
  }

  @Get('preview')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store, private')
  @Header('X-Content-Type-Options', 'nosniff')
  async preview(@Query('html') inlineHtml?: string): Promise<string> {
    const result = inlineHtml !== undefined
      ? await this.poliPage.render.preview({ template: inlineHtml, data: {} })
      : await this.poliPage.render.preview({
          project: 'getting-started',
          template: 'welcome',
          version: '1.0.0',
          data: { name: 'World' },
        })
    return previewResponse(result.html).html
  }
}
