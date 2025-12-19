import { z } from 'zod'
import { CouchConfig } from './config.mjs'
import { SimpleViewOptions, DefaultRowSchema } from './query.mts'

export const OnRow = z.function({ input: [DefaultRowSchema], output: z.undefined() })
/** @typedef { z.infer<typeof OnRow> } OnRowSchema */

export const SimpleViewQueryStream = z.function({ input: [CouchConfig, z.string().describe('the view name'), SimpleViewOptions, OnRow], output: z.promise(z.undefined()) })
/** @typedef { z.infer<typeof SimpleViewQueryStream> } SimpleViewQueryStreamSchema */

export const SimpleViewQueryStreamBound = z.function({ input: [z.string().describe('the view name'), SimpleViewOptions, OnRow], output: z.promise(z.undefined()) })
/** @typedef { z.infer<typeof SimpleViewQueryStreamBound> } SimpleViewQueryStreamBoundSchema */
