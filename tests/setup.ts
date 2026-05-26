import { afterEach } from '@jest/globals'

const baselineUnhandled = [...process.listeners('unhandledRejection')]
const baselineUncaught = [...process.listeners('uncaughtException')]

afterEach(() => {
  for (const fn of process.listeners('unhandledRejection')) {
    if (!baselineUnhandled.includes(fn)) process.off('unhandledRejection', fn)
  }
  for (const fn of process.listeners('uncaughtException')) {
    if (!baselineUncaught.includes(fn)) process.off('uncaughtException', fn)
  }
})
