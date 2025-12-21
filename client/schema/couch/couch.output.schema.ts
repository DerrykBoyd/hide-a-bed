import z from "zod"

export const ViewDoc = z.looseObject({
  _id: z.string(),
  _rev: z.string()
}).describe('A document returned in a view when include_docs is true')
export interface ViewDoc extends z.infer<typeof ViewDoc> { }

export const DefaultRowSchema = z.object({
  id: z.string().optional(),
  key: z.any().nullish(),
  value: z.any().nullish(),
  doc: ViewDoc.nullish(),
  error: z.string().optional().describe('usually not_found, if something is wrong with this doc')
})
export interface DefaultRowSchema extends z.infer<typeof DefaultRowSchema> { }

export type ViewRowValidated<DocSchema extends z.ZodType, KeySchema extends z.ZodType = z.ZodAny, ValueSchema extends z.ZodType = z.ZodAny> = {
  id?: string
  key?: z.output<KeySchema>
  value?: z.output<ValueSchema>
  doc?: z.output<DocSchema>
  error?: string
}

export const ViewQueryResponse = z.object({
  total_rows: z.number().nonnegative().optional().describe('total rows in the view'),
  offset: z.number().nonnegative().optional().describe('the offset of the first row in this result set'),
  error: z.string().optional().describe('if something is wrong'),
  rows: z.array(DefaultRowSchema).optional().describe('the rows returned by the view'),
  update_seq: z.number().optional().describe('the update sequence of the database at the time of the query')
})
export interface ViewQueryResponse extends z.infer<typeof ViewQueryResponse> { }

export type ViewQueryResponseValidated<DocSchema extends z.ZodType, KeySchema extends z.ZodType = z.ZodAny, ValueSchema extends z.ZodType = z.ZodAny> = Omit<ViewQueryResponse, 'rows'> & {
  rows: Array<ViewRowValidated<DocSchema, KeySchema, ValueSchema>>
}