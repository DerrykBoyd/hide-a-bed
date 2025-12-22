import { z } from 'zod'
import { CouchConfig } from './config.mts'
import { CouchDocResponse } from './couch.schema.mts'
import { CouchDoc } from './couch/couch.output.schema.ts'

export const BulkSaveRow = z.object({
  ok: z.boolean().nullish(),
  id: z.string().nullish(),
  rev: z.string().nullish(),
  error: z.string().nullish().describe('if an error occurred, one word reason, eg conflict'),
  reason: z.string().nullish().describe('a full error message')
})
export type BulkSaveRowSchema = z.infer<typeof BulkSaveRow>

export const BulkSaveResponseSchema = z.array(BulkSaveRow)
export type Response = z.infer<typeof BulkSaveResponseSchema>

export const BulkSaveMapResponseSchema = z.array(CouchDocResponse)
export type ResponseMap = z.infer<typeof BulkSaveMapResponseSchema>

export const OptionalIdCouchDoc = CouchDoc.extend({
  _id: CouchDoc.shape._id.optional()
})

export const BulkSave = z.function({ input: [CouchConfig, z.array(OptionalIdCouchDoc)], output: z.promise(BulkSaveResponseSchema) })
export type BulkSaveSchema = z.infer<typeof BulkSave>

export const BulkSaveBound = z.function({ input: [z.array(OptionalIdCouchDoc)], output: z.promise(BulkSaveResponseSchema) })
export type BulkSaveBoundSchema = z.infer<typeof BulkSaveBound>

export const BulkRemove = z.function({ input: [CouchConfig, z.array(z.string().describe('the ids to delete'))], output: z.promise(BulkSaveResponseSchema) })
export type BulkRemoveSchema = z.infer<typeof BulkRemove>

export const BulkRemoveBound = z.function({ input: [z.array(z.string().describe('the ids to delete'))], output: z.promise(BulkSaveResponseSchema) })
export type BulkRemoveBoundSchema = z.infer<typeof BulkRemoveBound>

export const BulkRemoveMap = z.function({ input: [CouchConfig, z.array(z.string().describe('the ids to delete'))], output: z.promise(z.array(CouchDocResponse)) })
export type BulkRemoveMapSchema = z.infer<typeof BulkRemoveMap>

export const BulkRemoveMapBound = z.function({ input: [z.array(z.string().describe('the ids to delete'))], output: z.promise(BulkSaveMapResponseSchema) })
export type BulkRemoveMapBoundSchema = z.infer<typeof BulkRemoveMapBound>

export const BulkSaveTransaction = z.function({ input: [CouchConfig, z.string().describe('transaction id'), z.array(CouchDoc)], output: z.promise(BulkSaveResponseSchema) })
export type BulkSaveTransactionSchema = z.infer<typeof BulkSaveTransaction>

export const BulkSaveTransactionBound = z.function({ input: [z.string().describe('transaction id'), z.array(CouchDoc)], output: z.promise(BulkSaveResponseSchema) })
export type BulkSaveTransactionBoundSchema = z.infer<typeof BulkSaveTransactionBound>

