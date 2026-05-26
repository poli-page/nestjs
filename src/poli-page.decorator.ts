import { Inject } from '@nestjs/common'
import { POLI_PAGE_CLIENT_TOKEN } from './poli-page.tokens'

export const InjectPoliPage = (): ParameterDecorator => Inject(POLI_PAGE_CLIENT_TOKEN)
