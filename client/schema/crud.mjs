import { z } from 'zod'
import { CouchConfig } from './config.mjs'

export const CouchDoc = z.looseObject({
  _id: z.string().describe('the couch doc id'),
  _rev: z.string().optional().nullish().describe('the doc revision'),
  _deleted: z.boolean().optional().describe('is the doc deleted')
})
/** @typedef { z.infer<typeof CouchDoc> } CouchDocSchema */

export const CouchDocResponse = z.object({
  ok: z.boolean().optional().describe('did the request succeed'),
  error: z.string().optional().describe('the error message, if did not succed'),
  statusCode: z.number(),
  id: z.string().optional().describe('the couch doc id'),
  rev: z.string().optional().describe('the new rev of the doc')
})
/** @typedef { z.infer<typeof CouchDocResponse> } CouchDocResponseSchema */

export const CouchPut = z.function({ input: [CouchConfig, CouchDoc], output: z.promise(CouchDocResponse) })
/** @typedef { z.infer<typeof CouchPut> } CouchPutSchema */

export const CouchPutBound = z.function({ input: [CouchDoc], output: z.promise(CouchDocResponse) })
/** @typedef { z.infer<typeof CouchPutBound> } CouchPutBoundSchema */

export const CouchGet = z.function({ input: [CouchConfig, z.string().describe('the couch doc id')], output: z.promise(CouchDoc.nullable()) })
/** @typedef { z.infer<typeof CouchGet> } CouchGetSchema */

export const CouchGetBound = z.function({ input: [z.string().describe('the couch doc id')], output: z.promise(CouchDoc.nullable()) })
/** @typedef { z.infer<typeof CouchGetBound> } CouchBoundSchema */

export const CouchGetAtRev = z.function({ input: [CouchConfig, z.string().describe('the couch doc id'), z.string().describe('the rev')], output: z.promise(CouchDoc.nullable()) })
/** @typedef { z.infer<typeof CouchGetAtRev> } CouchGetAtRevSchema */

export const CouchGetAtRevBound = z.function({ input: [z.string().describe('the couch doc id'), z.string().describe('the rev')], output: z.promise(CouchDoc.nullable()) })
/** @typedef { z.infer<typeof CouchGetAtRevBound> } CouchGetAtRevBoundSchema */

export const CouchGetOptions = z.object({
  rev: z.string().optional().describe('the couch doc revision')
})

export const CouchGetWithOptions = z.function({ input: [CouchConfig, z.string().describe('the couch doc id'), CouchGetOptions], output: z.promise(CouchDoc.nullable()) })
/** @typedef { z.infer<typeof CouchGetWithOptions> } CouchGetWithOptionsSchema */

export const CouchRemove = z.function({ input: [CouchConfig, z.string().describe('the couch doc id'), z.string().describe('the couch doc revision')], output: z.promise(CouchDocResponse) })
/** @typedef { z.infer<typeof CouchRemove> } CouchRemoveSchema */

export const CouchRemoveBound = z.function({ input: [z.string().describe('the couch doc id'), z.string().describe('the couch doc revision')], output: z.promise(CouchDocResponse) })
/** @typedef { z.infer<typeof CouchRemoveBound> } CouchRemoveBoundSchema */
