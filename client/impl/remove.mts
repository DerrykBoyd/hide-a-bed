import needle from 'needle';
import { CouchRemove } from '../schema/couch.schema.mts';
import { createLogger } from './logger.mts';
import { mergeNeedleOpts } from './utils/mergeNeedleOpts.mts';
import { RetryableError } from './utils/errors.mts';

export const remove = CouchRemove.implementAsync(async (config, id, rev) => {
  const logger = createLogger(config);
  const url = `${config.couch}/${id}?rev=${rev}`;
  const opts = {
    json: true,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  const mergedOpts = mergeNeedleOpts(config, opts);

  logger.info(`Deleting document with id: ${id}`);
  let resp;
  try {
    resp = await needle('delete', url, null, mergedOpts);
  } catch (err) {
    logger.error('Error during delete operation:', err);
    RetryableError.handleNetworkError(err);
  }

  if (!resp) {
    logger.error('No response received from delete request');
    throw new RetryableError('no response', 503);
  }

  let result;
  if (typeof resp.body === 'string') {
    try {
      result = JSON.parse(resp.body);
    } catch (e) {
      result = {};
    }
  } else {
    result = resp.body || {};
  }
  result.statusCode = resp.statusCode;

  if (resp.statusCode === 404) {
    logger.warn(`Document not found for deletion: ${id}`);
    result.ok = false;
    result.error = 'not_found';
    return result;
  }

  if (RetryableError.isRetryableStatusCode(resp.statusCode)) {
    logger.warn(`Retryable status code received: ${resp.statusCode}`);
    throw new RetryableError(
      result.reason || 'retryable error',
      resp.statusCode
    );
  }

  if (resp.statusCode !== 200) {
    logger.error(`Unexpected status code: ${resp.statusCode}`);
    throw new Error(result.reason || 'failed');
  }

  logger.info(`Successfully deleted document: ${id}`);
  return result;
});
