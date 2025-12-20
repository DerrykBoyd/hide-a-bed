import needle from 'needle';
import { put, RetryableError, withRetry } from '../index.mts';
import { BulkSave, BulkSaveTransaction } from '../schema/bulk.mjs';
import { createLogger } from './logger.mts';
import { mergeNeedleOpts } from './utils/mergeNeedleOpts.mts';
import { bulkGetDictionary } from './bulkGet.mts';
import { setupEmitter } from './trackedEmitter.mjs';
import { TransactionSetupError, TransactionVersionConflictError, TransactionBulkOperationError, TransactionRollbackError } from './transactionErrors.mjs';

/** @type { import('../schema/bulk.mjs').BulkSaveSchema } */

export const bulkSave = BulkSave.implementAsync(async (config, docs) => {
  /** @type {import('./logger.mts').Logger }  */
  const logger = createLogger(config);

  if (!docs) {
    logger.warn('bulkSave called with no docs');
    return { ok: false, error: 'noDocs', reason: 'no docs provided' };
  }
  if (!docs.length) {
    logger.warn('bulkSave called with empty docs array');
    return { ok: false, error: 'noDocs', reason: 'no docs provided' };
  }

  logger.info(`Starting bulk save of ${docs.length} documents`);
  const url = `${config.couch}/_bulk_docs`;
  const body = { docs };
  const opts = {
    json: true,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  const mergedOpts = mergeNeedleOpts(config, opts);
  let resp;
  try {
    resp = await needle('post', url, body, mergedOpts);
  } catch (err) {
    logger.error('Network error during bulk save:', err);
    RetryableError.handleNetworkError(err);
  }
  if (!resp) {
    logger.error('No response received from bulk save request');
    throw new RetryableError('no response', 503);
  }
  if (RetryableError.isRetryableStatusCode(resp.statusCode)) {
    logger.warn(`Retryable status code received: ${resp.statusCode}`);
    throw new RetryableError('retryable error during bulk save', resp.statusCode);
  }
  if (resp.statusCode !== 201) {
    logger.error(`Unexpected status code: ${resp.statusCode}`);
    throw new Error('could not save');
  }
  const results = resp?.body || [];
  return results;
});/** @type { import('../schema/bulk.mjs').BulkSaveTransactionSchema } bulkSaveTransaction */

export const bulkSaveTransaction = BulkSaveTransaction.implementAsync(async (config, transactionId, docs) => {
  const emitter = setupEmitter(config)
  const logger = createLogger(config)
  const retryOptions = {
    maxRetries: config.maxRetries ?? 10,
    initialDelay: config.initialDelay ?? 1000,
    backoffFactor: config.backoffFactor ?? 2
  }
  const _put = config.bindWithRetry ? withRetry(put.bind(null, config), retryOptions) : put.bind(null, config)
  logger.info(`Starting bulk save transaction ${transactionId} for ${docs.length} documents`)

  // Create transaction document
  const txnDoc = {
    _id: `txn:${transactionId}`,
    _rev: null,
    type: 'transaction',
    status: 'pending',
    changes: docs,
    timestamp: new Date().toISOString()
  }

  // Save transaction document
  let txnresp = await _put(txnDoc)
  logger.debug('Transaction document created:', txnDoc, txnresp)
  await emitter.emit('transaction-created', { txnresp, txnDoc })
  if (txnresp.error) {
    throw new TransactionSetupError('Failed to create transaction document', {
      error: txnresp.error,
      response: txnresp
    })
  }

  // Get current revisions of all documents
  const existingDocs = await bulkGetDictionary(config, docs.map(d => d._id))
  logger.debug('Fetched current revisions of documents:', existingDocs)
  await emitter.emit('transaction-revs-fetched', existingDocs)

  /** @type {string[]} */
  const revErrors = []
  // if any of the existingDocs, and the docs provided dont match on rev, then throw an error
  docs.forEach(d => {
    // @ts-ignore
    if (existingDocs.found[d._id] && existingDocs.found[d._id]._rev !== d._rev) revErrors.push(d._id)
    if (existingDocs.notFound[d._id] && d._rev) revErrors.push(d._id)
  })

  if (revErrors.length > 0) {
    throw new TransactionVersionConflictError(revErrors)
  }
  logger.debug('Checked document revisions:', existingDocs)
  await emitter.emit('transaction-revs-checked', existingDocs)

  /** @type {Record<string, import('../schema/couch.schema.mts').CouchDocSchema>} providedDocsById */
  const providedDocsById = {}
  docs.forEach((
    /** @type {import('../schema/couch.schema.mts').CouchDocSchema} */ d
  ) => {
    if (!d._id) return
    providedDocsById[d._id] = d
  })

  /** @type {import('../schema/bulk.mjs').Response} */
  const newDocsToRollback = []
  /** @type {import('../schema/bulk.mjs').Response} */
  const potentialExistingDocsToRollack = []
  /** @type {import('../schema/bulk.mjs').Response} */
  const failedDocs = []

  try {
    logger.info('Transaction started:', txnDoc)
    await emitter.emit('transaction-started', txnDoc)
    // Apply updates
    const results = await bulkSave(config, docs)
    logger.info('Transaction updates applied:', results)
    await emitter.emit('transaction-updates-applied', results)

    // Check for failures
    results.forEach(r => {
      if (!r.id) return // not enough info
      if (!r.error) {
        if (existingDocs.notFound[r.id]) newDocsToRollback.push(r)
        if (existingDocs.found[r.id]) potentialExistingDocsToRollack.push(r)
      } else {
        failedDocs.push(r)
      }
    })
    if (failedDocs.length > 0) {
      throw new TransactionBulkOperationError(failedDocs)
    }

    // Update transaction status to completed
    txnDoc.status = 'completed'
    // @ts-ignore TODO fix this
    txnDoc._rev = txnresp.rev
    txnresp = await _put(txnDoc)
    logger.info('Transaction completed:', txnDoc)
    await emitter.emit('transaction-completed', { txnresp, txnDoc })
    if (txnresp.statusCode !== 201) {
      logger.error('Failed to update transaction status to completed')
    }

    return results
  } catch (error) {
    logger.error('Transaction failed, attempting rollback:', error)

    // Rollback changes
    /** @type {Array<import('../schema/couch.schema.mts').CouchDocSchema>} */
    const toRollback = []
    potentialExistingDocsToRollack.forEach(row => {
      if (!row.id || !row.rev) return
      const doc = existingDocs.found[row.id]
      // @ts-ignore
      doc._rev = row.rev
      // @ts-ignore
      toRollback.push(doc)
    })
    newDocsToRollback.forEach(d => {
      if (!d.id || !d.rev) return
      const before = JSON.parse(JSON.stringify(providedDocsById[d.id]))
      before._rev = d.rev
      before._deleted = true
      toRollback.push(before)
    })

    // rollback all the changes
    const bulkRollbackResult = await bulkSave(config, toRollback)
    let status = 'rolled_back'
    bulkRollbackResult.forEach(r => {
      if (r.error) status = 'rollback_failed'
    })
    logger.warn('Transaction rolled back:', { bulkRollbackResult, status })
    await emitter.emit('transaction-rolled-back', { bulkRollbackResult, status })

    // Update transaction status to rolled back
    txnDoc.status = status
    // @ts-ignore TODO fix this
    txnDoc._rev = txnresp.rev
    txnresp = await _put(txnDoc)
    logger.warn('Transaction rollback status updated:', txnDoc)
    await emitter.emit('transaction-rolled-back-status', { txnresp, txnDoc })
    if (txnresp.statusCode !== 201) {
      logger.error('Failed to update transaction status to rolled_back')
    }
    throw new TransactionRollbackError(
      'Transaction failed and rollback was unsuccessful',
            /** @type {Error} */(error),
      bulkRollbackResult
    )
  }
})

