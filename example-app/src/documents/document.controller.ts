import {
  Controller, Delete, Get, Header, HttpCode, Param, Post, Redirect,
} from '@nestjs/common'
import { PoliPageService, previewResponse } from '@poli-page/nestjs'

@Controller('documents')
export class DocumentController {
  constructor(private readonly poliPage: PoliPageService) {}

  @Post()
  async create(): Promise<unknown> {
    const descriptor = await this.poliPage.render.document({
      project: 'getting-started',
      template: 'welcome',
      version: '1.0.0',
      data: { name: 'Stored doc' },
    })
    return descriptor
  }

  @Get(':id')
  @Redirect()
  async get(@Param('id') id: string): Promise<{ url: string; statusCode: number }> {
    const descriptor = await this.poliPage.documents.get(id)
    return { url: descriptor.presignedPdfUrl, statusCode: 302 }
  }

  @Get(':id/thumbnails')
  async thumbnails(@Param('id') id: string): Promise<unknown> {
    return this.poliPage.documents.thumbnails(id, { width: 480, format: 'png' })
  }

  @Get(':id/preview')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store, private')
  @Header('X-Content-Type-Options', 'nosniff')
  async preview(@Param('id') id: string): Promise<string> {
    const result = await this.poliPage.documents.preview(id)
    return previewResponse(result.html).html
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('id') id: string): Promise<void> {
    await this.poliPage.documents.delete(id)
  }
}
