import { z, ZodType } from 'zod'
import { CouchConfig } from './config.mjs'

export const CouchDoc = z.looseObject({
  _id: z.string().describe('the couch doc id'),
  _rev: z.string().optional().nullish().describe('the doc revision'),
  _deleted: z.boolean().optional().describe('is the doc deleted')
})
export type CouchDocSchema = z.infer<typeof CouchDoc>

export const CouchDocResponse = z.object({
  ok: z.boolean().optional().describe('did the request succeed'),
  error: z.string().optional().describe('the error message, if did not succed'),
  statusCode: z.number(),
  id: z.string().optional().describe('the couch doc id'),
  rev: z.string().optional().describe('the new rev of the doc')
})
export type CouchDocResponseSchema = z.infer<typeof CouchDocResponse>

export const CouchPut = z.function({ input: [CouchConfig, CouchDoc], output: z.promise(CouchDocResponse) })
export type CouchPutSchema = z.infer<typeof CouchPut>

export const CouchPutBound = z.function({ input: [CouchDoc], output: z.promise(CouchDocResponse) })
export type CouchPutBoundSchema = z.infer<typeof CouchPutBound>

export const CouchGet = z.function({ input: [CouchConfig, z.string().describe('the couch doc id')], output: z.promise(CouchDoc.nullable()) })
export type CouchGetSchema = z.infer<typeof CouchGet>

export const CouchGetBound = z.function({ input: [z.string().describe('the couch doc id')], output: z.promise(CouchDoc.nullable()) })
export type CouchBoundSchema = z.infer<typeof CouchGetBound>

export const CouchGetAtRev = z.function({ input: [CouchConfig, z.string().describe('the couch doc id'), z.string().describe('the rev')], output: z.promise(CouchDoc.nullable()) })
export type CouchGetAtRevSchema = z.infer<typeof CouchGetAtRev>

export const CouchGetAtRevBound = z.function({ input: [z.string().describe('the couch doc id'), z.string().describe('the rev')], output: z.promise(CouchDoc.nullable()) })
export type CouchGetAtRevBoundSchema = z.infer<typeof CouchGetAtRevBound>

const ZodSchema = z.custom((value) => value instanceof ZodType, {
  message: 'docSchema must be a Zod schema'
})

export const CouchGetOptions = z.object({
  rev: z.string().optional().describe('the couch doc revision'),
  validate: z.object({
    docSchema: ZodSchema.optional()
  }).optional().describe('optional document validation rules')
})

export const CouchGetWithOptions = z.function({ input: [CouchConfig, z.string().describe('the couch doc id'), CouchGetOptions], output: z.promise(CouchDoc.nullable()) })
export type CouchGetWithOptionsSchema = z.infer<typeof CouchGetWithOptions>

export const CouchRemove = z.function({ input: [CouchConfig, z.string().describe('the couch doc id'), z.string().describe('the couch doc revision')], output: z.promise(CouchDocResponse) })
export type CouchRemoveSchema = z.infer<typeof CouchRemove>

export const CouchRemoveBound = z.function({ input: [z.string().describe('the couch doc id'), z.string().describe('the couch doc revision')], output: z.promise(CouchDocResponse) })
export type CouchRemoveBoundSchema = z.infer<typeof CouchRemoveBound>
