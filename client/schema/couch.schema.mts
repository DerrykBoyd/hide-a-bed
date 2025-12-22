import { z } from 'zod'
import { CouchConfig } from './config.mts'
import type { StandardSchemaV1 } from '../types/standard-schema.ts'

export const CouchDoc = z.looseObject({
  _id: z.string().describe('the couch doc id'),
  _rev: z.string().optional().nullish().describe('the doc revision'),
  _deleted: z.boolean().optional().describe('is the doc deleted')
})
export type CouchDoc = StandardSchemaV1.InferOutput<typeof CouchDoc>

export const CouchDocResponse = z.object({
  ok: z.boolean().optional().describe('did the request succeed'),
  error: z.string().optional().describe('the error message, if did not succed'),
  statusCode: z.number(),
  id: z.string().optional().describe('the couch doc id'),
  rev: z.string().optional().describe('the new rev of the doc')
})
export type CouchDocResponseSchema = StandardSchemaV1.InferOutput<typeof CouchDocResponse>

export const CouchPut = z.function({ input: [CouchConfig, CouchDoc], output: z.promise(CouchDocResponse) })
export type CouchPutSchema = StandardSchemaV1.InferOutput<typeof CouchPut>

export const CouchPutBound = z.function({ input: [CouchDoc], output: z.promise(CouchDocResponse) })
export type CouchPutBoundSchema = StandardSchemaV1.InferOutput<typeof CouchPutBound>

export const CouchGet = z.function({ input: [CouchConfig, z.string().describe('the couch doc id')], output: z.promise(CouchDoc.nullable()) })
export type CouchGetSchema = StandardSchemaV1.InferOutput<typeof CouchGet>

export const CouchGetBound = z.function({ input: [z.string().describe('the couch doc id')], output: z.promise(CouchDoc.nullable()) })
export type CouchBoundSchema = StandardSchemaV1.InferOutput<typeof CouchGetBound>

export const CouchGetAtRev = z.function({ input: [CouchConfig, z.string().describe('the couch doc id'), z.string().describe('the rev')], output: z.promise(CouchDoc.nullable()) })
export type CouchGetAtRevSchema = StandardSchemaV1.InferOutput<typeof CouchGetAtRev>

export const CouchGetAtRevBound = z.function({ input: [z.string().describe('the couch doc id'), z.string().describe('the rev')], output: z.promise(CouchDoc.nullable()) })
export type CouchGetAtRevBoundSchema = StandardSchemaV1.InferOutput<typeof CouchGetAtRevBound>

const ValidSchema = z.custom((value) => {
  return value !== null && typeof value === "object" && "~standard" in value
}, {
  message: 'docSchema must be a valid StandardSchemaV1 schema'
})

export const CouchGetOptions = z.object({
  rev: z.string().optional().describe('the couch doc revision'),
  validate: z.object({
    docSchema: ValidSchema.optional()
  }).optional().describe('optional document validation rules')
})

export const CouchGetWithOptions = z.function({ input: [CouchConfig, z.string().describe('the couch doc id'), CouchGetOptions], output: z.promise(CouchDoc.nullable()) })
export type CouchGetWithOptionsSchema = StandardSchemaV1.InferOutput<typeof CouchGetWithOptions>

export const CouchRemove = z.function({ input: [CouchConfig, z.string().describe('the couch doc id'), z.string().describe('the couch doc revision')], output: z.promise(CouchDocResponse) })
export type CouchRemoveSchema = StandardSchemaV1.InferOutput<typeof CouchRemove>

export const CouchRemoveBound = z.function({ input: [z.string().describe('the couch doc id'), z.string().describe('the couch doc revision')], output: z.promise(CouchDocResponse) })
export type CouchRemoveBoundSchema = StandardSchemaV1.InferOutput<typeof CouchRemoveBound>