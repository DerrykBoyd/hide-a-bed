import { z } from 'zod'
import { CouchConfig } from './config.mjs'
import { SimpleViewQueryResponse, DefaultRowSchema } from './query.mts'
import { CouchDoc, CouchDocResponse } from './crud.mjs'

export const BulkSaveRow = z.object({
  ok: z.boolean().nullish(),
  id: z.string().nullish(),
  rev: z.string().nullish(),
  error: z.string().nullish().describe('if an error occured, one word reason, eg conflict'),
  reason: z.string().nullish().describe('a full error message')
})
/** @typedef { z.infer<typeof BulkSaveRow> } BulkSaveRowSchema */

export const BulkSaveResponseSchema = z.array(BulkSaveRow)
/** @typedef { z.infer<typeof BulkSaveResponseSchema> } Response */

export const BulkSaveMapResponseSchema = z.array(CouchDocResponse)
/** @typedef { z.infer<typeof BulkSaveMapResponseSchema> } ResponseMap */

export const OptionalIdCouchDoc = CouchDoc.extend({
  _id: CouchDoc.shape._id.optional()
})

export const BulkSave = z.function({ input: [CouchConfig, z.array(OptionalIdCouchDoc)], output: z.promise(BulkSaveResponseSchema) })
/** @typedef { z.infer<typeof BulkSave> } BulkSaveSchema */

export const BulkSaveBound = z.function({ input: [z.array(OptionalIdCouchDoc)], output: z.promise(BulkSaveResponseSchema) })
/** @typedef { z.infer<typeof BulkSaveBound> } BulkSaveBoundSchema */

export const BulkGet = z.function({ input: [CouchConfig, z.array(z.string().describe('the ids to get'))], output: z.promise(SimpleViewQueryResponse) })
/** @typedef { z.infer<typeof BulkGet> } BulkGetSchema */

export const BulkGetBound = z.function({ input: [z.array(z.string().describe('the ids to get'))], output: z.promise(SimpleViewQueryResponse) })
/** @typedef { z.infer<typeof BulkGetBound> } BulkGetBoundSchema */

export const BulkGetWithOptions = z.function({
  input: [CouchConfig, z.array(z.string().describe('the ids to get')), z.object({
    includeDocs: z.boolean().optional().describe('the couch doc revision')
  })],
  output: z.promise(SimpleViewQueryResponse)
})
/** @typedef { z.infer<typeof BulkGetWithOptions> } BulkGetWithOptionsSchema */

export const BulkRemove = z.function({ input: [CouchConfig, z.array(z.string().describe('the ids to delete'))], output: z.promise(BulkSaveResponseSchema) })
/** @typedef { z.infer<typeof BulkRemove> } BulkRemoveSchema */

export const BulkRemoveBound = z.function({ input: [z.array(z.string().describe('the ids to delete'))], output: z.promise(BulkSaveResponseSchema) })
/** @typedef { z.infer<typeof BulkRemoveBound> } BulkRemoveBoundSchema */

export const BulkRemoveMap = z.function({ input: [CouchConfig, z.array(z.string().describe('the ids to delete'))], output: z.promise(z.array(CouchDocResponse)) })
/** @typedef { z.infer<typeof BulkRemoveMap> } BulkRemoveMapSchema */

export const BulkRemoveMapBound = z.function({ input: [z.array(z.string().describe('the ids to delete'))], output: z.promise(BulkSaveMapResponseSchema) })
/** @typedef { z.infer<typeof BulkRemoveMapBound> } BulkRemoveMapBoundSchema */

export const BulkGetDictionaryResponse = z.object({
  found: z.record(z.string(), CouchDoc),
  notFound: z.record(z.string(), DefaultRowSchema)
})
/** @typedef { z.infer<typeof BulkGetDictionaryResponse> } BulkGetDictionaryResponseSchema */

export const BulkGetDictionary = z.function({ input: [CouchConfig, z.array(z.string().describe('the ids to get'))], output: z.promise(BulkGetDictionaryResponse) })
/** @typedef { z.infer<typeof BulkGetDictionary> } BulkGetDictionarySchema */

export const BulkGetDictionaryBound = z.function({ input: [z.array(z.string().describe('the ids to get'))], output: z.promise(BulkGetDictionaryResponse) })
/** @typedef { z.infer<typeof BulkGetDictionaryBound> } BulkGetDictionaryBoundSchema */

export const BulkSaveTransaction = z.function({ input: [CouchConfig, z.string().describe('transaction id'), z.array(CouchDoc)], output: z.promise(BulkSaveResponseSchema) })
/** @typedef { z.infer<typeof BulkSaveTransaction> } BulkSaveTransactionSchema */

export const BulkSaveTransactionBound = z.function({ input: [z.string().describe('transaction id'), z.array(CouchDoc)], output: z.promise(BulkSaveResponseSchema) })
/** @typedef { z.infer<typeof BulkSaveTransactionBound> } BulkSaveTransactionBoundSchema */
