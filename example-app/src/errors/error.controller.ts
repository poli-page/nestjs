import { Controller, Get } from '@nestjs/common'
import { PoliPageService } from '@poli-page/nestjs'

@Controller('errors')
export class ErrorController {
  constructor(private readonly poliPage: PoliPageService) {}

  @Get('bad-version')
  async badVersion(): Promise<unknown> {
    return this.poliPage.render.pdf({
      project: 'getting-started',
      template: 'welcome',
      version: 'not-a-version',
      data: {},
    })
  }
}
