import needle from 'needle';
import { put, RetryableError, withRetry, type CouchDoc } from '../index.mts';
import { BulkSave, BulkSaveTransaction, type Response } from '../schema/bulk.mts';
import { createLogger } from './logger.mts';
import { mergeNeedleOpts } from './utils/mergeNeedleOpts.mts';
import { bulkGetDictionary } from './bulkGet.mts';
import { setupEmitter } from './trackedEmitter.mts';
import { TransactionSetupError, TransactionVersionConflictError, TransactionBulkOperationError, TransactionRollbackError } from './transactionErrors.mts';
import type z from 'zod';

export const bulkSave = BulkSave.implementAsync(async (config, docs) => {
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
});

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
  const transactionDoc = {
    _id: `txn:${transactionId}`,
    _rev: null,
    type: 'transaction',
    status: 'pending',
    changes: docs,
    timestamp: new Date().toISOString()
  }

  // Save transaction document
  let transactionResponse = await _put(transactionDoc)
  logger.debug('Transaction document created:', transactionDoc, transactionResponse)
  await emitter.emit('transaction-created', { transactionResponse, txnDoc: transactionDoc })
  if (transactionResponse.error) {
    throw new TransactionSetupError('Failed to create transaction document', {
      error: transactionResponse.error,
      response: transactionResponse
    })
  }

  // Get current revisions of all documents
  const existingDocs = await bulkGetDictionary(config, docs.map(d => d._id))
  logger.debug('Fetched current revisions of documents:', existingDocs)
  await emitter.emit('transaction-revs-fetched', existingDocs)

  /** @type {string[]} */
  const revErrors: string[] = []
  // if any of the existingDocs, and the docs provided do not match on rev, then throw an error
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

  const providedDocsById: Record<string, z.infer<typeof CouchDoc>> = {}
  docs.forEach((d) => {
    if (!d._id) return
    providedDocsById[d._id] = d
  })

  const newDocsToRollback: Response = []
  const potentialExistingDocsToRollback: Response = []
  const failedDocs: Response = []

  try {
    logger.info('Transaction started:', transactionDoc)
    await emitter.emit('transaction-started', transactionDoc)
    // Apply updates
    const results = await bulkSave(config, docs)
    logger.info('Transaction updates applied:', results)
    await emitter.emit('transaction-updates-applied', results)

    // Check for failures
    results.forEach(r => {
      if (!r.id) return // not enough info
      if (!r.error) {
        if (existingDocs.notFound[r.id]) newDocsToRollback.push(r)
        if (existingDocs.found[r.id]) potentialExistingDocsToRollback.push(r)
      } else {
        failedDocs.push(r)
      }
    })
    if (failedDocs.length > 0) {
      throw new TransactionBulkOperationError(failedDocs)
    }

    // Update transaction status to completed
    transactionDoc.status = 'completed'
    // @ts-ignore TODO fix this
    transactionDoc._rev = transactionResponse.rev
    transactionResponse = await _put(transactionDoc)
    logger.info('Transaction completed:', transactionDoc)
    await emitter.emit('transaction-completed', { transactionResponse, transactionDoc })
    if (transactionResponse.statusCode !== 201) {
      logger.error('Failed to update transaction status to completed')
    }

    return results
  } catch (error) {
    logger.error('Transaction failed, attempting rollback:', error)

    // Rollback changes
    const toRollback: CouchDoc[] = []
    potentialExistingDocsToRollback.forEach(row => {
      if (!row.id || !row.rev) return
      const doc = existingDocs.found[row.id]
      doc._rev = row.rev
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
    transactionDoc.status = status
    // @ts-ignore TODO fix this
    transactionDoc._rev = transactionResponse.rev
    transactionResponse = await _put(transactionDoc)
    logger.warn('Transaction rollback status updated:', transactionDoc)
    await emitter.emit('transaction-rolled-back-status', { transactionResponse, transactionDoc })
    if (transactionResponse.statusCode !== 201) {
      logger.error('Failed to update transaction status to rolled_back')
    }
    throw new TransactionRollbackError(
      'Transaction failed and rollback was unsuccessful',
      (error as Error),
      bulkRollbackResult
    )
  }
})

