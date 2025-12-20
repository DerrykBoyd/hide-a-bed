import needle from 'needle';
import { RetryableError, NotFoundError } from '../index.mts';
import { CouchGet, CouchGetAtRev, CouchGetWithOptions } from '../schema/couch.schema.mjs';
import { createLogger } from './logger.mts';
import { mergeNeedleOpts } from './utils/mergeNeedleOpts.mts';

/** @type { import('../schema/couch.schema.mjs').CouchGetSchema } */

export const get = CouchGet.implementAsync(async (config, id) => {
  const getOptions = {};
  return _getWithOptions(config, id, getOptions);
});/** @type { import('../schema/crud.mjs').CouchGetAtRevSchema } */

export const getAtRev = CouchGetAtRev.implementAsync(async (config, id, rev) => {
  const getOptions = { rev }
  return _getWithOptions(config, id, getOptions)
});
/** @type { import('../schema/couch.schema.mjs').CouchGetWithOptionsSchema } */

const _getWithOptions = CouchGetWithOptions.implementAsync(async (config, id, getOpts) => {
  const logger = createLogger(config)
  const rev = getOpts?.rev
  const path = rev ? `${id}?rev=${rev}` : id
  const url = `${config.couch}/${path}`
  const opts = {
    json: true,
    headers: {
      'Content-Type': 'application/json'
    }
  }
  const mergedOpts = mergeNeedleOpts(config, opts)
  logger.info(`Getting document with id: ${id}, rev ${rev || 'latest'}`)

  try {
    const resp = await needle('get', url, mergedOpts)
    if (!resp) {
      logger.error('No response received from get request')
      throw new RetryableError('no response', 503)
    }
    const result = resp?.body || {}
    if (resp.statusCode === 404) {
      if (config.throwOnGetNotFound) {
        logger.warn(`Document not found (throwing error): ${id}, rev ${rev || 'latest'}`)
        throw new NotFoundError(id, result.reason || 'not_found')
      } else {
        logger.debug(`Document not found (returning undefined): ${id}, rev ${rev || 'latest'}`)
        return null
      }
    }
    if (RetryableError.isRetryableStatusCode(resp.statusCode)) {
      logger.warn(`Retryable status code received: ${resp.statusCode}`)
      throw new RetryableError(result.reason || 'retryable error', resp.statusCode)
    }
    if (resp.statusCode !== 200) {
      logger.error(`Unexpected status code: ${resp.statusCode}`)
      throw new Error(result.reason || 'failed')
    }
    logger.info(`Successfully retrieved document: ${id}, rev ${rev || 'latest'}`)
    return result
  } catch (err) {
    logger.error('Error during get operation:', err)
    RetryableError.handleNetworkError(err)
  }
})

