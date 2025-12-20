import needle from 'needle'
import { CouchConfig, type CouchConfigInput } from '../schema/config.mjs'
import { CouchDoc } from '../schema/couch.schema.mts'
import { DefaultRowSchema, type SimpleViewQueryResponseValidated, type ViewRow } from '../schema/query.mts'
import { createLogger } from './logger.mts'
import { mergeNeedleOpts } from './utils/mergeNeedleOpts.mts'
import { RetryableError } from './utils/errors.mts'
import { z } from 'zod'

export type BulkGetResponse<DocSchema extends z.ZodType> = SimpleViewQueryResponseValidated<DocSchema, z.ZodType, z.ZodObject<{
  rev: z.ZodString;
}>>

export type BulkGetOptions<DocSchema extends z.ZodType> = {
  includeDocs?: boolean
  validate?: {
    docSchema?: DocSchema
  }
}

export type BulkGetDictionaryOptions<DocSchema extends z.ZodType> = Omit<BulkGetOptions<DocSchema>, 'includeDocs'>

export type BulkGetDictionaryResult<DocSchema extends z.ZodType> = {
  found: Record<string, z.output<DocSchema>>
  notFound: Record<string, z.infer<typeof DefaultRowSchema>>
}

function parseRows<DocSchema extends z.ZodType>(
  rows: unknown,
  includeDocs: boolean,
  docSchema: DocSchema
): Array<ViewRow<DocSchema>> {
  if (!includeDocs) {
    const fallbackRows = z.array(DefaultRowSchema).parse(rows ?? [])
    return fallbackRows as Array<ViewRow<DocSchema>>
  }

  const parsedRows = z.array(z.looseObject({
    id: z.string().optional(),
    key: z.any().nullish(),
    value: z.any().nullish(),
    doc: docSchema.nullish(), // allow errors to pass validation
    error: z.string().optional()
  })).parse(rows ?? [])

  return parsedRows as Array<ViewRow<DocSchema>>
}

async function executeBulkGet(_config: CouchConfigInput, ids: string[], includeDocs: boolean) {
  const configParseResult = CouchConfig.safeParse(_config)
  const logger = createLogger(_config)
  logger.info(`Starting bulk get for ${ids.length} documents`)

  if (!configParseResult.success) {
    logger.error('Invalid configuration provided for bulk get', configParseResult.error)
    throw configParseResult.error
  }

  const config = configParseResult.data
  const url = `${config.couch}/_all_docs${includeDocs ? '?include_docs=true' : ''}`
  const payload = { keys: ids }
  const opts = {
    json: true,
    headers: {
      'Content-Type': 'application/json'
    }
  }
  const mergedOpts = mergeNeedleOpts(config, opts)

  try {
    const resp = await needle('post', url, payload, mergedOpts)
    if (RetryableError.isRetryableStatusCode(resp.statusCode)) {
      logger.warn(`Retryable status code received: ${resp.statusCode}`)
      throw new RetryableError('retryable error during bulk get', resp.statusCode)
    }
    if (resp.statusCode !== 200) {
      logger.error(`Unexpected status code: ${resp.statusCode}`)
      throw new Error('could not fetch')
    }
    return resp.body
  } catch (err) {
    logger.error('Network error during bulk get:', err)
    RetryableError.handleNetworkError(err)
  }
}

export async function _bulkGetWithOptions(
  config: CouchConfigInput,
  ids: string[],
  options?: { includeDocs?: boolean }
): Promise<BulkGetResponse<typeof CouchDoc>>

export async function _bulkGetWithOptions<DocSchema extends z.ZodType>(
  config: CouchConfigInput,
  ids: string[],
  options: { includeDocs: false }
): Promise<BulkGetResponse<typeof CouchDoc>>

export async function _bulkGetWithOptions<DocSchema extends z.ZodType>(
  config: CouchConfigInput,
  ids: string[],
  options: { includeDocs: true; validate?: { docSchema?: DocSchema } }
): Promise<BulkGetResponse<DocSchema>>

export async function _bulkGetWithOptions<DocSchema extends z.ZodType>(
  config: CouchConfigInput,
  ids: string[],
  options: BulkGetOptions<DocSchema> = {}
): Promise<BulkGetResponse<DocSchema>> {
  const includeDocs = options.includeDocs ?? true
  const body = await executeBulkGet(config, ids, includeDocs)

  if (!body) {
    throw new RetryableError('no response', 503)
  }

  if (body.error) {
    throw new Error(typeof body.reason === 'string' ? body.reason : 'could not fetch')
  }

  const docSchema = options.validate?.docSchema || CouchDoc
  const rows = parseRows(body.rows, includeDocs, docSchema)

  return {
    ...body,
    rows
  } as BulkGetResponse<DocSchema>
}

export async function bulkGet(
  config: CouchConfigInput,
  ids: string[]
): Promise<BulkGetResponse<typeof CouchDoc>>

export async function bulkGet<DocSchema extends z.ZodType>(
  config: CouchConfigInput,
  ids: string[],
  options: BulkGetOptions<DocSchema> | undefined
): Promise<BulkGetResponse<DocSchema>>

export async function bulkGet<DocSchema extends z.ZodType>(
  config: CouchConfigInput,
  ids: string[],
  options: BulkGetOptions<DocSchema> = {}
): Promise<BulkGetResponse<DocSchema>> {
  return _bulkGetWithOptions<DocSchema>(config, ids, {
    includeDocs: true,
    validate: options.validate
  })
}

export async function bulkGetDictionary<DocSchema extends z.ZodType>(
  config: CouchConfigInput,
  ids: string[],
): Promise<BulkGetDictionaryResult<DocSchema>>

export async function bulkGetDictionary<DocSchema extends z.ZodType>(
  config: CouchConfigInput,
  ids: string[],
  options: BulkGetDictionaryOptions<DocSchema>
): Promise<BulkGetDictionaryResult<DocSchema>>

export async function bulkGetDictionary<DocSchema extends z.ZodType>(
  config: CouchConfigInput,
  ids: string[],
  options: BulkGetDictionaryOptions<DocSchema> = {}
): Promise<BulkGetDictionaryResult<DocSchema>> {
  const response = await bulkGet(config, ids, options)

  const results: BulkGetDictionaryResult<DocSchema> = {
    found: {},
    notFound: {}
  }

  for (const row of response.rows ?? []) {
    const key = typeof row.key === 'string' ? row.key : row.id
    if (!key) continue

    if (row.error || !row.doc) {
      results.notFound[key] = DefaultRowSchema.parse(row)
      continue
    }

    const doc = row.doc as z.output<DocSchema>
    const docId = typeof (doc as any)?._id === 'string' ? (doc as any)._id : row.id

    if (!docId) {
      results.notFound[key] = DefaultRowSchema.parse(row)
      continue
    }

    results.found[docId] = doc
  }

  return results
}
