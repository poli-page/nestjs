import { Injectable } from '@nestjs/common'
import type { PoliPage, DocumentsNamespace, RenderNamespace } from '@poli-page/sdk'
import { InjectPoliPage } from './poli-page.decorator'

@Injectable()
export class PoliPageService {
  constructor(@InjectPoliPage() public readonly client: PoliPage) {}

  get render(): RenderNamespace {
    return this.client.render
  }

  get documents(): DocumentsNamespace {
    return this.client.documents
  }
}
