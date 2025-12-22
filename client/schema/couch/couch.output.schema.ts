import z from "zod"
import type { StandardSchemaV1 } from "../../types/standard-schema.ts"

/**
 * Default schema for a returned CouchDB document if no validation schema is provided.
 */
export const CouchDoc = z.looseObject({
  _id: z.string().describe('the couch doc id'),
  _rev: z.string().optional().nullish().describe('the doc revision'),
  _deleted: z.boolean().optional().describe('is the doc deleted')
})
export type CouchDoc = StandardSchemaV1.InferOutput<typeof CouchDoc>

/**
 * A type for input CouchDB documents (without required _id).
 */
export type CouchDocInput = Omit<CouchDoc, '_id'> & { _id?: string }

/**
 * Default schema for a CouchDB view row if no validation schema is provided.
 */
export const ViewRow = z.object({
  id: z.string().optional(),
  key: z.any().nullish(),
  value: z.any().nullish(),
  doc: CouchDoc.nullish(),
  error: z.string().optional().describe('usually not_found, if something is wrong with this doc')
})
export interface ViewRow extends StandardSchemaV1.InferOutput<typeof ViewRow> { }

/**
 * A CouchDB view row with validated key, value, and document schemas.
 */
export type ViewRowValidated<DocSchema extends StandardSchemaV1, KeySchema extends StandardSchemaV1, ValueSchema extends StandardSchemaV1> = {
  id?: string
  key?: StandardSchemaV1.InferOutput<KeySchema>
  value?: StandardSchemaV1.InferOutput<ValueSchema>
  doc?: StandardSchemaV1.InferOutput<DocSchema>
  error?: string
}

/**
 * Response type for a CouchDB view query if no validation schemas are provided.
 */
export const ViewQueryResponse = z.object({
  total_rows: z.number().nonnegative().optional().describe('total rows in the view'),
  offset: z.number().nonnegative().optional().describe('the offset of the first row in this result set'),
  error: z.string().optional().describe('if something is wrong'),
  rows: z.array(ViewRow).optional().describe('the rows returned by the view'),
  update_seq: z.number().optional().describe('the update sequence of the database at the time of the query')
})
export interface ViewQueryResponse extends z.infer<typeof ViewQueryResponse> { }

/**
 * Response type for a CouchDB view query with validated key, value, and document schemas.
 */
export type ViewQueryResponseValidated<DocSchema extends StandardSchemaV1, KeySchema extends StandardSchemaV1 = StandardSchemaV1<unknown>, ValueSchema extends StandardSchemaV1 = StandardSchemaV1<unknown>> = Omit<ViewQueryResponse, 'rows'> & {
  rows: Array<ViewRowValidated<DocSchema, KeySchema, ValueSchema>>
}

/**
 * CouchDB _bulk_docs response schemas
 */
export const BulkSaveResponse = z.array(z.object({
  ok: z.boolean().nullish(),
  id: z.string().nullish(),
  rev: z.string().nullish(),
  error: z.string().nullish().describe('if an error occurred, one word reason, eg conflict'),
  reason: z.string().nullish().describe('a full error message')
}))
export type BulkSaveResponse = z.infer<typeof BulkSaveResponse>
