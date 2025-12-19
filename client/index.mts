import { bulkGet, bulkSave, bulkRemove, bulkRemoveMap, bulkGetDictionary, bulkSaveTransaction } from './impl/bulk.mjs'
import { get, put, getAtRev, remove } from './impl/crud.mjs'
import { patch, patchDangerously } from './impl/patch.mjs'
import { createLock, removeLock } from './impl/sugar/lock.mjs'
import { watchDocs } from './impl/sugar/watch.mjs'
import { query } from './impl/query.mts'
import { queryStream } from './impl/stream.mts'
import { createQuery } from './impl/queryBuilder.mts'
import { withRetry } from './impl/retry.mts'

import { CouchConfig, type CouchConfigSchema } from './schema/config.mjs'
import { QueryBuilder } from './impl/queryBuilder.mts'
import type z from 'zod'
import type { BoundQuery } from './schema/query.mts'
import { getDBInfo } from './impl/utils/getDBInfo.mts'
import { NotFoundError, RetryableError, type NetworkError } from './impl/errors.mts'

/**
 * Bind core CouchDB operations to a specific configuration, optionally applying retry wrappers.
 * @param config The CouchDB configuration
 * @returns An object with CouchDB operations bound to the provided configuration
 */
function doBind(config: CouchConfigSchema) {
  // Default retry options
  const retryOptions = {
    maxRetries: config.maxRetries ?? 10,
    initialDelay: config.initialDelay ?? 1000,
    backoffFactor: config.backoffFactor ?? 2
  }

  const queryBound = ((view: Parameters<typeof query>[1], options: Parameters<typeof query>[2]) => query(config, view, options)) as BoundQuery

  // Create the object without the config property first
  const result = {
    get: config.bindWithRetry ? withRetry(get.bind(null, config), retryOptions) : get.bind(null, config),
    getAtRev: config.bindWithRetry ? withRetry(getAtRev.bind(null, config), retryOptions) : getAtRev.bind(null, config),
    put: config.bindWithRetry ? withRetry(put.bind(null, config), retryOptions) : put.bind(null, config),
    remove: config.bindWithRetry ? withRetry(remove.bind(null, config), retryOptions) : remove.bind(null, config),
    bulkGet: config.bindWithRetry ? withRetry(bulkGet.bind(null, config), retryOptions) : bulkGet.bind(null, config),
    bulkSave: config.bindWithRetry ? withRetry(bulkSave.bind(null, config), retryOptions) : bulkSave.bind(null, config),
    // query updated with inferred types and validation for POC
    query: config.bindWithRetry ? withRetry(queryBound, retryOptions) as BoundQuery : queryBound,
    // 
    queryStream: config.bindWithRetry ? withRetry(queryStream.bind(null, config), retryOptions) : queryStream.bind(null, config),
    // Sugar Methods
    patch: config.bindWithRetry ? withRetry(patch.bind(null, config), retryOptions) : patch.bind(null, config),
    patchDangerously: patchDangerously.bind(null, config), // patchDangerously not included in retry
    bulkRemove: config.bindWithRetry ? withRetry(bulkRemove.bind(null, config), retryOptions) : bulkRemove.bind(null, config),
    bulkRemoveMap: config.bindWithRetry ? withRetry(bulkRemoveMap.bind(null, config), retryOptions) : bulkRemoveMap.bind(null, config),
    bulkGetDictionary: config.bindWithRetry ? withRetry(bulkGetDictionary.bind(null, config), retryOptions) : bulkGetDictionary.bind(null, config),
    bulkSaveTransaction: bulkSaveTransaction.bind(null, config),
    createLock: createLock.bind(null, config),
    removeLock: removeLock.bind(null, config),
    watchDocs: watchDocs.bind(null, config),
    getDBInfo: config.bindWithRetry ? withRetry(getDBInfo.bind(null, config), retryOptions) : getDBInfo.bind(null, config),
  }

  return result
}

type BoundInstance = ReturnType<typeof doBind> & {
  options(overrides: Partial<z.input<typeof CouchConfig>>): BoundInstance
}

/**
 * Build a validated binding that exposes CouchDB helpers plus an options() helper for overrides.
 * @param config The CouchDB configuration
 * @returns A bound instance with CouchDB operations and an options() method for overrides
 */
const bindConfig = (
  config: z.input<typeof CouchConfig>
): BoundInstance => {
  const parsedConfig = CouchConfig.parse(config)

  const funcs = doBind(parsedConfig)

  // Add the options function that returns a new bound instance
  // this allows the user to override some options
  const reconfigure: BoundInstance['options'] = (
    overrides
  ) => {
    const newConfig: z.input<typeof CouchConfig> = { ...config, ...overrides }
    return bindConfig(newConfig)
  }

  const bound: BoundInstance = { ...funcs, options: reconfigure }
  return bound
}

export {
  get,
  getAtRev,
  put,
  remove,
  bulkGet,
  bulkSave,
  query,
  queryStream,
  getDBInfo,

  // sugar methods
  patch,
  patchDangerously,
  bulkRemove,
  bulkRemoveMap,
  bulkGetDictionary,
  bulkSaveTransaction,

  bindConfig,
  withRetry,
  QueryBuilder,
  createQuery,
  createLock,
  removeLock,

  // Error types
  NotFoundError,
  RetryableError,

}

export type {
  ViewString,
  ViewRow,
  SimpleViewOptions,
  SimpleViewQueryResponse,
  SimpleViewQueryResponseValidated,
  DefaultRowSchema
} from './schema/query.mts'
export type { RetryOptions } from './impl/retry.mts'
export type { NetworkError } from './impl/errors.mts'