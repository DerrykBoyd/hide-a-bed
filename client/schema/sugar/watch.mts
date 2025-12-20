// @ts-check
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

export const WatchDocs = z.function({
  input: [CouchConfig, z.union([z.string(), z.array(z.string())]), z.function({
    input: [z.any()],
    output: z.void()
  }), WatchOptions], output: WatchEmitter
})

export type WatchOptionsSchema = z.infer<typeof WatchOptions>
export type WatchDocsSchema = z.infer<typeof WatchDocs>

export const WatchDocsBound = z.function({ input: [z.union([z.string(), z.array(z.string())]), z.function(), WatchOptions], output: WatchEmitter })

export type WatchDocsBoundSchema = z.infer<typeof WatchDocsBound>
