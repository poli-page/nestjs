import { Module } from '@nestjs/common'
import { PoliPageModule } from '@poli-page/nestjs'
import { DemoController } from './demo/demo.controller'
import { RenderController } from './render/render.controller'
import { DocumentController } from './documents/document.controller'
import { ErrorController } from './errors/error.controller'

@Module({
  imports: [
    PoliPageModule.forRootAsync({
      registerGlobalExceptionFilter: true,
      useFactory: () => ({
        apiKey: process.env.POLI_PAGE_API_KEY ?? 'pp_test_missing_set_env',
        baseUrl: process.env.POLI_PAGE_BASE_URL,
      }),
    }),
  ],
  controllers: [DemoController, RenderController, DocumentController, ErrorController],
})
export class AppModule {}
