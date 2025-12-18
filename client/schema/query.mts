import { z, ZodType } from 'zod'

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
  doc: ViewDoc.optional(),
  error: z.string().optional().describe('usually not_found, if something is wrong with this doc')
})
export type DefaultRowSchema = z.infer<typeof DefaultRowSchema>

export type ViewRow<DocSchema, KeySchema, ValueSchema> = {
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
  rows: z.array(DefaultRowSchema)
})
export type SimpleViewQueryResponse = z.infer<typeof SimpleViewQueryResponse>

export type SimpleViewQueryResponseValidated<DocSchema, KeySchema, ValueSchema> = {
  total_rows?: number
  offset?: number
  error?: string
  rows: Array<ViewRow<DocSchema, KeySchema, ValueSchema>>
}

export const SimpleViewOptions = z.object({
  startkey: z.any().optional(),
  endkey: z.any().optional(),
  descending: z.boolean().optional().describe('sort results descending'),
  skip: z.number().nonnegative().optional().describe('skip this many rows'),
  limit: z.number().nonnegative().optional().describe('limit the results to this many rows'),
  key: z.any().optional(),
  keys: z.array(z.any()).optional(),
  include_docs: z.boolean().optional().describe('join the id to the doc and return it'),
  reduce: z.boolean().optional().describe('reduce the results'),
  group: z.boolean().optional().describe('group the results'),
  group_level: z.number().positive().optional().describe('group the results at this level'),
}).describe('base options for a CouchDB view query')
export type ViewOptions = z.input<typeof SimpleViewOptions> 

// export const SimpleViewQuery = z.function({ input: [CouchConfig, z.string().describe('the view name'), SimpleViewOptions], output: z.promise(SimpleViewQueryResponse) })
// export type SimpleViewQuery = z.infer<typeof SimpleViewQuery>

// export const SimpleViewQueryBound = z.function({ input: [z.string().describe('the view name'), SimpleViewOptions], output: z.promise(SimpleViewQueryResponse) })
// export type SimpleViewQueryBound = z.infer<typeof SimpleViewQueryBound>

export type BoundQuery = {
  (view: ViewString, options?: ViewOptions): Promise<SimpleViewQueryResponse>;
  <DocSchema extends ZodType, KeySchema extends ZodType, ValueSchema extends ZodType>(
    view: ViewString,
    options: ViewOptions & {
      include_docs: false;
      validate?: {
        keySchema?: KeySchema;
        valueSchema?: ValueSchema;
      };
    }
  ): Promise<SimpleViewQueryResponseValidated<DocSchema, KeySchema, ValueSchema>>;
  <DocSchema extends ZodType, KeySchema extends ZodType, ValueSchema extends ZodType>(
    view: ViewString,
    options: ViewOptions & {
      include_docs: true;
      validate?: {
        docSchema?: DocSchema;
        keySchema?: KeySchema;
        valueSchema?: ValueSchema;
      };
    }
  ): Promise<SimpleViewQueryResponseValidated<DocSchema, KeySchema, ValueSchema>>;
};