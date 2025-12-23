import { z } from 'zod'
import { CouchConfig } from './config.mts'
import type { StandardSchemaV1 } from '../types/standard-schema.ts'
import { CouchPutResponse } from './couch/couch.output.schema.ts'

export const CouchRemove = z.function({ input: [CouchConfig, z.string().describe('the couch doc id'), z.string().describe('the couch doc revision')], output: z.promise(CouchPutResponse) })
export type CouchRemoveSchema = StandardSchemaV1.InferOutput<typeof CouchRemove>

export const CouchRemoveBound = z.function({ input: [z.string().describe('the couch doc id'), z.string().describe('the couch doc revision')], output: z.promise(CouchPutResponse) })
export type CouchRemoveBoundSchema = StandardSchemaV1.InferOutput<typeof CouchRemoveBound>