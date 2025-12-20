import { z } from 'zod'
import { CouchConfig } from './config.mts'
import { CouchDocResponse } from './couch.schema.mts'

export const PatchProperties = z.record(z.string(), z.any())
export const StrictPatchProperties = z.object({
  _rev: z.string()
}).and(PatchProperties)

export const Patch = z.function({ input: [CouchConfig, z.string().describe('the couch doc id'), StrictPatchProperties], output: z.promise(CouchDocResponse) })
export type PatchSchema = z.infer<typeof Patch>

export const PatchBound = z.function({ input: [z.string().describe('the couch doc id'), StrictPatchProperties], output: z.promise(CouchDocResponse) })
export type PatchBoundSchema = z.infer<typeof PatchBound>

export const PatchDangerously = z.function({ input: [CouchConfig, z.string().describe('the couch doc id'), PatchProperties], output: z.promise(CouchDocResponse.optional()) })
export type PatchDangerouslySchema = z.infer<typeof PatchDangerously>

export const PatchDangerouslyBound = z.function({ input: [z.string().describe('the couch doc id'), PatchProperties], output: z.promise(CouchDocResponse) })
export type PatchDangerouslyBoundSchema = z.infer<typeof PatchDangerouslyBound>
