import needle from 'needle'
import { CouchConfig, type CouchConfigInput } from '../schema/config.mts'
import { CouchDoc } from '../schema/couch.schema.mts'
import { createLogger } from './logger.mts'
import { mergeNeedleOpts } from './utils/mergeNeedleOpts.mts'
import { RetryableError } from './utils/errors.mts'
import { z } from 'zod'
import { DefaultRowSchema, ViewDoc, ViewQueryResponse, type ViewQueryResponseValidated } from '../schema/couch/couch.output.schema.ts'

export type BulkGetResponse<DocSchema extends z.ZodType = typeof CouchDoc> = ViewQueryResponseValidated<DocSchema, z.ZodType, z.ZodObject<{
  rev: z.ZodString;
}>>

export type OnInvalidDocAction = 'throw' | 'skip'

export type BulkGetOptions<DocSchema extends z.ZodType> = {
  includeDocs?: boolean
  validate?: {
    docSchema: DocSchema
    onInvalidDoc?: OnInvalidDocAction
  }
}

function parseRows<DocSchema extends z.ZodType>(
  rows: unknown,
  includeDocs: boolean,
  schema: DocSchema,
  onInvalidDoc: OnInvalidDocAction = 'throw'
) {
  if (!Array.isArray(rows)) {
    return []
  }

  if (!includeDocs) {
    const fallbackRows = z.array(DefaultRowSchema).parse(rows ?? [])
    return fallbackRows
  }

  let parsedRows = []
  for (const row of rows ?? []) {
    const parsed = z.looseObject({
      id: z.string().optional(),
      key: z.any().nullish(),
      value: z.any().nullish(),
      doc: schema.nullish(), // allow errors to pass validation
      error: z.string().optional()
    }).safeParse(row)

    if (!parsed.success) {
      if (onInvalidDoc === 'throw') {
        throw parsed.error
      } else {
        // skip invalid doc
        continue
      }
    }

    parsedRows.push(parsed.data)
  }

  return parsedRows
}

/**
 * Executes the bulk get operation against CouchDB.
 * 
 * @param _config CouchDB configuration
 * @param ids Array of document IDs to retrieve
 * @param includeDocs Whether to include documents in the response
 * 
 * @returns The raw response body from CouchDB
 * 
 * @throws {RetryableError} When a retryable HTTP status code is encountered or no response is received.
 * @throws {Error} When CouchDB returns a non-retryable error payload.
 */
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

/**
 * Bulk get documents by IDs with options.
 * 
 * @template DocSchema - Zod schema used to validate each returned document, if provided.
 *
 * @param config - CouchDB configuration data that is validated before use.
 * @param ids - Array of document IDs to retrieve.
 * @param options - Options for bulk get operation, including whether to include documents and validation schema.
 *
 * @returns The bulk get response with rows optionally validated against the supplied document schema.
 *
 * @throws {RetryableError} When a retryable HTTP status code is encountered or no response is received.
 * @throws {ZodError} When the configuration or validation schemas fail to parse.
 * @throws {Error} When CouchDB returns a non-retryable error payload.
 */
async function _bulkGetWithOptions<DocSchema extends z.ZodType>(
  config: CouchConfigInput,
  ids: string[],
  options: { includeDocs: false }
): Promise<BulkGetResponse>

async function _bulkGetWithOptions<DocSchema extends z.ZodType>(
  config: CouchConfigInput,
  ids: string[],
  options: { includeDocs: true; validate?: { docSchema: DocSchema, onInvalidDoc?: 'throw' | 'skip' } }
): Promise<BulkGetResponse<DocSchema>>

async function _bulkGetWithOptions<DocSchema extends z.ZodType>(
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
  const rows = parseRows(body.rows, includeDocs, docSchema, options.validate?.onInvalidDoc)

  return {
    ...body,
    rows
  }
}

export async function bulkGet(
  config: CouchConfigInput,
  ids: string[]
): Promise<BulkGetResponse<typeof CouchDoc>>

export async function bulkGet(
  config: CouchConfigInput,
  ids: string[],
  options: { includeDocs: false }
): Promise<BulkGetResponse<typeof CouchDoc>>

export async function bulkGet<DocSchema extends z.ZodType>(
  config: CouchConfigInput,
  ids: string[],
  options: { includeDocs?: true; validate?: { docSchema: DocSchema, onInvalidDoc?: 'throw' | 'skip' } }
): Promise<BulkGetResponse<DocSchema>>

/**
 * Bulk get documents by IDs.
 * 
 * @remarks
 * By default, documents are included in the response. To exclude documents, set `includeDocs` to `false`.
 * When `includeDocs` is `true`, you can provide a Zod schema to validate the documents.
 * When a schema is provided, you can specify how to handle invalid documents using `onInvalidDoc` option.
 * `onInvalidDoc` can be set to `'throw'` (default) to throw an error on invalid documents, or `'skip'` to omit them from the results.
 *
 * @template DocSchema - Zod schema used to validate each returned document, if provided.
 *
 * @param config - CouchDB configuration data that is validated before use.
 * @param ids - Array of document IDs to retrieve.
 * @param options - Options for bulk get operation, including whether to include documents and validation schema.
 *
 * @returns The bulk get response with rows optionally validated against the supplied document schema.
 *
 * @throws {RetryableError} When a retryable HTTP status code is encountered or no response is received.
 * @throws {ZodError} When the configuration or validation schemas fail to parse.
 * @throws {Error} When CouchDB returns a non-retryable error payload.
 */
export async function bulkGet<DocSchema extends z.ZodType>(
  config: CouchConfigInput,
  ids: string[],
  options: BulkGetOptions<DocSchema> = {}
) {
  if (options?.includeDocs === false) {
    return _bulkGetWithOptions(config, ids, {
      includeDocs: false
    })
  }

  return _bulkGetWithOptions<DocSchema>(config, ids, {
    includeDocs: true,
    validate: options?.validate
  })
}

/**
 * Bound version of bulkGet with config pre-applied.
 */
export type BulkGetBound = {
  (ids: string[], options?: {
    includeDocs?: boolean,
  }): Promise<ViewQueryResponse>;
  <DocSchema extends z.ZodType>(ids: string[], options?: BulkGetOptions<DocSchema>): Promise<ViewQueryResponseValidated<DocSchema>>;
}

/**
 * Bulk get documents by IDs and return a dictionary of found and not found documents.
 */

export type BulkGetDictionaryOptions<DocSchema extends z.ZodType> = Omit<BulkGetOptions<DocSchema>, 'includeDocs'>

export type BulkGetDictionaryResult<DocSchema extends z.ZodType = typeof CouchDoc> = {
  found: Record<string, z.output<DocSchema>>
  notFound: Record<string, z.infer<typeof DefaultRowSchema>>
}

export async function bulkGetDictionary(
  config: CouchConfigInput,
  ids: string[],
): Promise<BulkGetDictionaryResult>

export async function bulkGetDictionary<DocSchema extends z.ZodType>(
  config: CouchConfigInput,
  ids: string[],
  options: Omit<BulkGetDictionaryOptions<DocSchema>, 'includeDocs'>
): Promise<BulkGetDictionaryResult<DocSchema>>

/**
 * Bulk get documents by IDs and return a dictionary of found and not found documents.
 * 
 * @template DocSchema - Schema used to validate each returned document, if provided. Note: if a document is found and it fails validation this will throw a ZodError.
 *
 * @param config - CouchDB configuration data that is validated before use.
 * @param ids - Array of document IDs to retrieve.
 * @param options - Options for bulk get operation, including validation schema.
 * 
 * @returns An object containing found documents and not found rows.
 * 
 * @throws {RetryableError} When a retryable HTTP status code is encountered or no response is received.
 * @throws {ZodError} When the configuration or validation schemas fail to parse.
 * @throws {Error} When CouchDB returns a non-retryable error payload.
 */
export async function bulkGetDictionary<DocSchema extends z.ZodType>(
  config: CouchConfigInput,
  ids: string[],
  options?: Omit<BulkGetDictionaryOptions<DocSchema>, 'includeDocs'>
) {
  const response = await bulkGet(config, ids, {
    includeDocs: true,
    ...options
  })

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

export type BulkGetDictionaryBound = {
  (ids: string[]): Promise<BulkGetDictionaryResult>;
  <DocSchema extends z.ZodType = typeof CouchDoc>(
    ids: string[],
    options: BulkGetOptions<DocSchema>
  ): Promise<BulkGetDictionaryResult<DocSchema>>
}
