import { Controller, Get, Header } from '@nestjs/common'
import { demoHtml } from './demo-template'

@Controller()
export class DemoController {
  @Get('/')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  dashboard(): string {
    return demoHtml
  }
}
