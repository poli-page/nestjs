import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const demoHtml: string = readFileSync(resolve(__dirname, 'demo.html'), 'utf8')
