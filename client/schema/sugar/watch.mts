import { z } from 'zod'
import { CouchConfig } from '../config.mts'

const WatchEmitter = z.object({
  on: z.function({
    input: [z.string(), z.function({
      input: [z.any()],
      output: z.void()
    })], output: z.any()
  }),
  removeListener: z.function({
    input: [z.string(), z.function(
      {
        input: [z.any()],
        output: z.void()
      }
    )], output: z.any()
  }),
  stop: z.function({ output: z.void() })
})

export const WatchOptions = z.object({
  include_docs: z.boolean().default(false),
  maxRetries: z.number().describe('maximum number of retries before giving up'),
  initialDelay: z.number().describe('initial delay between retries in milliseconds'),
  maxDelay: z.number().describe('maximum delay between retries in milliseconds')
}).partial()
export interface WatchOptionsInput extends z.input<typeof WatchOptions> { }
export interface WatchOptionsSchema extends z.infer<typeof WatchOptions> { }
