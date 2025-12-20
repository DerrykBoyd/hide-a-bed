import { z, ZodType } from 'zod'
import type { ZodTypeAny } from 'zod/v3'

export type ViewString = "_all_docs" | `_design/${string}/_view/${string}`

export const ViewDoc = z.looseObject({
  _id: z.string(),
  _rev: z.string()
}).describe('A document returned in a view when include_docs is true')
export type ViewDoc = z.infer<typeof ViewDoc>

export const DefaultRowSchema = z.object({
  id: z.string().optional(),
  key: z.any().nullish(),
  value: z.any().nullish(),
  doc: ViewDoc.nullish(),
  error: z.string().optional().describe('usually not_found, if something is wrong with this doc')
})
export type DefaultRowSchema = z.infer<typeof DefaultRowSchema>

export type ViewRow<DocSchema, KeySchema = ZodTypeAny, ValueSchema = ZodTypeAny> = {
  id?: string
  key: z.output<KeySchema>
  value: z.output<ValueSchema>
  doc?: z.output<DocSchema>
  error?: string
}

export const SimpleViewQueryResponse = z.object({
  total_rows: z.number().nonnegative().optional().describe('total rows in the view'),
  offset: z.number().nonnegative().optional().describe('the offset of the first row in this result set'),
  error: z.string().optional().describe('if something is wrong'),
  rows: z.array(DefaultRowSchema).optional().describe('the rows returned by the view'),
  update_seq: z.number().optional().describe('the update sequence of the database at the time of the query')
})
export type SimpleViewQueryResponse = z.infer<typeof SimpleViewQueryResponse>

export type SimpleViewQueryResponseValidated<DocSchema, KeySchema = ZodTypeAny, ValueSchema = ZodTypeAny> = Omit<SimpleViewQueryResponse, 'rows'> & {
  rows: Array<ViewRow<DocSchema, KeySchema, ValueSchema>>
}

export const SimpleViewOptions = z.object({
  descending: z.boolean().optional().describe('sort results descending'),
  endkey_docid: z.string().optional().describe('stop returning records when this document ID is reached'),
  endkey: z.any().optional(),
  group_level: z.number().positive().optional().describe('group the results at this level'),
  group: z.boolean().optional().describe('group the results'),
  include_docs: z.boolean().optional().describe('join the id to the doc and return it'),
  inclusive_end: z.boolean().optional().describe('whether the endkey is included in the result, default true'),
  key: z.any().optional(),
  keys: z.array(z.any()).optional(),
  limit: z.number().nonnegative().optional().describe('limit the results to this many rows'),
  reduce: z.boolean().optional().describe('reduce the results'),
  skip: z.number().nonnegative().optional().describe('skip this many rows'),
  sorted: z.boolean().optional().describe('sort returned rows, default true'),
  stable: z.boolean().optional().describe('ensure the view index is not updated during the query, default false'),
  startkey: z.any().optional(),
  startkey_docid: z.string().optional().describe('start returning records when this document ID is reached'),
  update: z.enum(['true', 'false', 'lazy']).optional().describe('whether to update the view index before returning results, default true'),
  update_seq: z.boolean().optional().describe('include the update sequence in the result'),
}).describe('base options for a CouchDB view query')
export type SimpleViewOptions = z.input<typeof SimpleViewOptions>

export type QueryBound = {
  (view: ViewString, options?: SimpleViewOptions): Promise<SimpleViewQueryResponse>;
  <DocSchema extends ZodType, KeySchema extends ZodType, ValueSchema extends ZodType>(
    view: ViewString,
    options: SimpleViewOptions & {
      include_docs: false;
      validate?: {
        keySchema?: KeySchema;
        valueSchema?: ValueSchema;
      };
    }
  ): Promise<SimpleViewQueryResponseValidated<DocSchema, KeySchema, ValueSchema>>;
  <DocSchema extends ZodType, KeySchema extends ZodType, ValueSchema extends ZodType>(
    view: ViewString,
    options: SimpleViewOptions & {
      include_docs: true;
      validate?: {
        docSchema?: DocSchema;
        keySchema?: KeySchema;
        valueSchema?: ValueSchema;
      };
    }
  ): Promise<SimpleViewQueryResponseValidated<DocSchema, KeySchema, ValueSchema>>;
};