import { z } from 'zod'
import { CouchConfig } from './config.mjs'
import { CouchDocResponse } from './crud.mjs'

export const PatchProperties = z.record(z.string(), z.any())
export const StrictPatchProperties = z.object({
  _rev: z.string()
}).and(PatchProperties)

export const Patch = z.function({ input: [CouchConfig, z.string().describe('the couch doc id'), StrictPatchProperties], output: z.promise(CouchDocResponse) })
/** @typedef { z.infer<typeof Patch> } PatchSchema */

export const PatchBound = z.function({ input: [z.string().describe('the couch doc id'), StrictPatchProperties], output: z.promise(CouchDocResponse) })
/** @typedef { z.infer<typeof PatchBound> } PatchBoundSchema */

export const PatchDangerously = z.function({ input: [CouchConfig, z.string().describe('the couch doc id'), PatchProperties], output: z.promise(CouchDocResponse) })
/** @typedef { z.infer<typeof PatchDangerously> } PatchDangerouslySchema */

export const PatchDangerouslyBound = z.function({ input: [z.string().describe('the couch doc id'), PatchProperties], output: z.promise(CouchDocResponse) })
/** @typedef { z.infer<typeof PatchDangerouslyBound> } PatchDangerouslyBoundSchema */
