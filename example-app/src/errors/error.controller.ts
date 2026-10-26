import { Controller, Get } from '@nestjs/common'
import { PoliPageService } from '@poli-page/nestjs'

@Controller('errors')
export class ErrorController {
  constructor(private readonly poliPage: PoliPageService) {}

  // Answers 404 TEMPLATE_NOT_FOUND through the global PoliPageExceptionFilter.
  @Get('not-found')
  async notFound(): Promise<unknown> {
    return this.poliPage.render.pdf({
      project: 'getting-started',
      template: 'does-not-exist',
      data: {},
    })
  }
}
