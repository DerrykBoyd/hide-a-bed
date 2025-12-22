import needle, { type NeedleResponse } from "needle";
import { RetryableError } from './utils/errors.mts';
import { createLogger } from "./logger.mts";
import { mergeNeedleOpts } from "./utils/mergeNeedleOpts.mts";
import { CouchConfig, CouchDBInfo, type CouchConfigInput } from "../schema/config.mts";

export const getDBInfo = async (configInput: CouchConfigInput) => {
  const config = CouchConfig.parse(configInput);
  const logger = createLogger(config);
  const url = `${config.couch}`;

  let resp: NeedleResponse | undefined;
  try {
    resp = await needle('get', url, mergeNeedleOpts(config, {
      json: true,
      headers: {
        'Content-Type': 'application/json'
      }
    }));
  } catch (err) {
    logger.error('Error during get operation:', err);
    RetryableError.handleNetworkError(err);
  }

  if (!resp) {
    logger.error('No response received from get request');
    throw new RetryableError('no response', 503);
  }

  const result = resp.body;
  if (RetryableError.isRetryableStatusCode(resp.statusCode)) {
    logger.warn(`Retryable status code received: ${resp.statusCode}`);
    throw new RetryableError(result.reason ?? 'retryable error', resp.statusCode);
  }

  return CouchDBInfo.parse(result);
}
