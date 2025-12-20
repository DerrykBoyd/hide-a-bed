import { bulkGet, bulkGetDictionary, type BulkGetDictionaryBound } from './impl/bulkGet.mts'
import { bulkSaveTransaction } from './impl/bulkSave.mts'
import { bulkRemove, bulkRemoveMap } from './impl/bulkRemove.mts'
import { bulkSave } from './impl/bulkSave.mts'
import { remove } from './impl/remove.mts'
import { put } from './impl/put.mts'
import { getAtRev, type GetBound, type GetAtRevBound } from './impl/get.mts'
import { get } from './impl/get.mts'
import { patch, patchDangerously } from './impl/patch.mts'
import { createLock, removeLock } from './impl/sugar/lock.mts'
import { watchDocs } from './impl/sugar/watch.mts'
import { query } from './impl/query.mts'
import { queryStream } from './impl/stream.mts'
import { createQuery } from './impl/utils/queryBuilder.mts'
import { withRetry } from './impl/retry.mts'

import { CouchConfig, type CouchConfigSchema } from './schema/config.mts'
import { QueryBuilder } from './impl/utils/queryBuilder.mts'
import type z from 'zod'
import type { QueryBound } from './schema/query.mts'
import { getDBInfo } from './impl/utils/getDBInfo.mts'
import { NotFoundError, RetryableError, type NetworkError } from './impl/utils/errors.mts'
import type { BulkGetBound } from "./impl/bulkGet.mts"

/**
 * @internal
 * 
 * Helper to bind a function to a config, optionally wrapping it with retry logic.
 * Casts to the appropriate bound function type.
 * @param func The function to bind
 * @param config The CouchDB configuration
 * @returns The bound function, possibly wrapped with retry logic
 */
function getBoundWithRetry<
  TBound extends (...args: any[]) => Promise<any>
>(
  func: (config: CouchConfigSchema, ...args: any[]) => Promise<any>,
  config: CouchConfigSchema
) {
  const bound = func.bind(null, config)
  if (config.bindWithRetry) {
    return withRetry(bound, {
      maxRetries: config.maxRetries ?? 10,
      initialDelay: config.initialDelay ?? 1000,
      backoffFactor: config.backoffFactor ?? 2
    }) as TBound
  } else {
    return bound as TBound
  }
}

/**
 * @internal
 * 
 * Bind core CouchDB operations to a specific configuration, optionally applying retry wrappers.
 * @param config The CouchDB configuration
 * @returns An object with CouchDB operations bound to the provided configuration
 */
export function doBind(config: CouchConfigSchema) {
  // Default retry options
  const retryOptions = {
    maxRetries: config.maxRetries ?? 10,
    initialDelay: config.initialDelay ?? 1000,
    backoffFactor: config.backoffFactor ?? 2
  }

  // Create the object without the config property first
  const result = {
    /**
     * These functions use overloaded signatures
     * To preserve the overloads we need dedicated Bound types
     */
    bulkGet: getBoundWithRetry<BulkGetBound>(bulkGet, config),
    bulkGetDictionary: getBoundWithRetry<BulkGetDictionaryBound>(bulkGetDictionary, config),
    get: getBoundWithRetry<GetBound>(get, config),
    getAtRev: getBoundWithRetry<GetAtRevBound>(getAtRev, config),
    query: getBoundWithRetry<QueryBound>(query, config),

    /**
     * These functions have single signatures and can be bound directly
     */
    bulkRemove: config.bindWithRetry ? withRetry(bulkRemove.bind(null, config), retryOptions) : bulkRemove.bind(null, config),
    bulkRemoveMap: config.bindWithRetry ? withRetry(bulkRemoveMap.bind(null, config), retryOptions) : bulkRemoveMap.bind(null, config),
    bulkSave: config.bindWithRetry ? withRetry(bulkSave.bind(null, config), retryOptions) : bulkSave.bind(null, config),
    bulkSaveTransaction: bulkSaveTransaction.bind(null, config),
    getDBInfo: config.bindWithRetry ? withRetry(getDBInfo.bind(null, config), retryOptions) : getDBInfo.bind(null, config),
    patch: config.bindWithRetry ? withRetry(patch.bind(null, config), retryOptions) : patch.bind(null, config),
    patchDangerously: patchDangerously.bind(null, config), // patchDangerously not included in retry
    put: config.bindWithRetry ? withRetry(put.bind(null, config), retryOptions) : put.bind(null, config),
    queryStream: config.bindWithRetry ? withRetry(queryStream.bind(null, config), retryOptions) : queryStream.bind(null, config),
    remove: config.bindWithRetry ? withRetry(remove.bind(null, config), retryOptions) : remove.bind(null, config),

    createLock: createLock.bind(null, config),
    removeLock: removeLock.bind(null, config),
    watchDocs: watchDocs.bind(null, config),
  }

  return result
}

export type BoundInstance = ReturnType<typeof doBind> & {
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

  // binding
  bindConfig,
  withRetry,
  QueryBuilder,
  createQuery,
  createLock,
  removeLock,

  // Error types
  NotFoundError,
  RetryableError
}

export type {
  BulkGetOptions,
  BulkGetDictionaryOptions,
  BulkGetDictionaryResult,
  BulkGetResponse
} from './impl/bulkGet.mts'
export type { GetOptions, GetBound, GetAtRevBound } from './impl/get.mts'
export type {
  ViewString,
  ViewRow,
  SimpleViewOptions,
  SimpleViewQueryResponse,
  SimpleViewQueryResponseValidated,
  DefaultRowSchema,
  QueryBound
} from './schema/query.mts'
export type { RetryOptions } from './impl/retry.mts'
export type { NetworkError } from './impl/utils/errors.mts'
export type { BulkGetBound, BulkGetDictionaryBound } from './impl/bulkGet.mts'
export type { OnRow } from './impl/stream.mts'
export type { CouchConfig } from './schema/config.mts'
export type { CouchDoc } from './schema/couch.schema.mts'