import { Controller, Get, Header, Query } from '@nestjs/common'
import {
  PoliPageService,
  PoliPagePdfFile,
  previewResponse,
} from '@poli-page/nestjs'

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
