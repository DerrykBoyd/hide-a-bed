import needle from 'needle'
import { z } from 'zod'
import type { CouchConfigInput } from '../schema/config.mjs'
import { CouchDoc, CouchGetOptions } from '../schema/couch.schema.mts'
import { createLogger } from './logger.mts'
import { mergeNeedleOpts } from './utils/mergeNeedleOpts.mts'
import { RetryableError, NotFoundError } from './utils/errors.mts'

export type GetOptions<DocSchema extends z.ZodType> = {
  validate?: {
    docSchema?: DocSchema
  }
}

type InternalGetOptions<DocSchema extends z.ZodType> = GetOptions<DocSchema> & {
  rev?: string
}

async function _getWithOptions<DocSchema extends z.ZodType>(
  config: CouchConfigInput,
  id: string,
  options: InternalGetOptions<DocSchema>
): Promise<z.output<DocSchema> | null> {
  const parsedOptions = CouchGetOptions.parse({
    rev: options.rev,
    validate: options.validate
  })

  const logger = createLogger(config)
  const rev = parsedOptions.rev
  const path = rev ? `${id}?rev=${rev}` : id
  const url = `${config.couch}/${path}`

  const httpOptions = {
    json: true,
    headers: {
      'Content-Type': 'application/json'
    }
  }

  const requestOptions = mergeNeedleOpts(config, httpOptions)
  logger.info(`Getting document with id: ${id}, rev ${rev ?? 'latest'}`)

  try {
    const resp = await needle('get', url, null, requestOptions)
    if (!resp) {
      logger.error('No response received from get request')
      throw new RetryableError('no response', 503)
    }

    const body = resp.body ?? null

    if (resp.statusCode === 404) {
      if (config.throwOnGetNotFound) {
        const reason = typeof (body as any)?.reason === 'string' ? (body as any).reason : 'not_found'
        logger.warn(`Document not found (throwing error): ${id}, rev ${rev ?? 'latest'}`)
        throw new NotFoundError(id, reason)
      }

      logger.debug(`Document not found (returning undefined): ${id}, rev ${rev ?? 'latest'}`)
      return null
    }

    if (RetryableError.isRetryableStatusCode(resp.statusCode)) {
      const reason = typeof (body as any)?.reason === 'string' ? (body as any).reason : 'retryable error'
      logger.warn(`Retryable status code received: ${resp.statusCode}`)
      throw new RetryableError(reason, resp.statusCode)
    }

    if (resp.statusCode !== 200) {
      const reason = typeof (body as any)?.reason === 'string' ? (body as any).reason : 'failed'
      logger.error(`Unexpected status code: ${resp.statusCode}`)
      throw new Error(reason)
    }

    const docSchema = (parsedOptions.validate?.docSchema ?? CouchDoc) as DocSchema
    const typedDoc = docSchema.parse(body)

    logger.info(`Successfully retrieved document: ${id}, rev ${rev ?? 'latest'}`)
    return typedDoc
  } catch (err) {
    logger.error('Error during get operation:', err)
    RetryableError.handleNetworkError(err)
  }
}

export async function get(
  config: CouchConfigInput,
  id: string
): Promise<z.output<typeof CouchDoc> | null>

export async function get<DocSchema extends z.ZodType>(
  config: CouchConfigInput,
  id: string,
  options: GetOptions<DocSchema> | undefined
): Promise<z.output<DocSchema> | null>

export async function get<DocSchema extends z.ZodType = typeof CouchDoc>(
  config: CouchConfigInput,
  id: string,
  options: GetOptions<DocSchema> = {}
): Promise<z.output<DocSchema> | null> {
  return _getWithOptions<DocSchema>(config, id, options)
}

export type BoundGet = <DocSchema extends z.ZodType = typeof CouchDoc>(
  id: string,
  options?: GetOptions<DocSchema>
) => Promise<z.output<DocSchema> | null>

export async function getAtRev(
  config: CouchConfigInput,
  id: string,
  rev: string
): Promise<z.output<typeof CouchDoc> | null>

export async function getAtRev<DocSchema extends z.ZodType>(
  config: CouchConfigInput,
  id: string,
  rev: string,
  options: GetOptions<DocSchema> | undefined
): Promise<z.output<DocSchema> | null>

export async function getAtRev<DocSchema extends z.ZodType = typeof CouchDoc>(
  config: CouchConfigInput,
  id: string,
  rev: string,
  options: GetOptions<DocSchema> = {}
): Promise<z.output<DocSchema> | null> {
  return _getWithOptions<DocSchema>(config, id, { ...options, rev })
}

export type BoundGetAtRev = <DocSchema extends z.ZodType = typeof CouchDoc>(
  id: string,
  rev: string,
  options?: GetOptions<DocSchema> | undefined
) => Promise<z.output<DocSchema> | null>