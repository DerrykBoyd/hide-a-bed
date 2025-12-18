// @ts-check
import { z } from 'zod'
import { CouchConfig } from '../config.mjs'

const WatchEmitter = z.object({
  on: z.function({ input: [z.string(), z.function()], output: z.any() }),
  removeListener: z.function({ input: [z.string(), z.function()], output: z.any() }),
  stop: z.function({ output: z.void() })
})

export const WatchOptions = z.object({
  include_docs: z.boolean().prefault(false)
}).partial()

export const WatchDocs = z.function({ input: [CouchConfig, z.union([z.string(), z.array(z.string())]), z.function(), WatchOptions], output: WatchEmitter })

/** @typedef { z.infer<typeof WatchOptions> } WatchOptionsSchema */
/** @typedef { z.infer<typeof WatchDocs> } WatchDocsSchema */

export const WatchDocsBound = z.function({ input: [z.union([z.string(), z.array(z.string())]), z.function(), WatchOptions], output: WatchEmitter })

/** @typedef { z.infer<typeof WatchDocsBound> } WatchDocsBoundSchema */
