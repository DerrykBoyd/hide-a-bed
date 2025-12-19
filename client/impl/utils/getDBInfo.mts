import needle, { type NeedleResponse } from "needle";
import { GetDBInfo, type GetDBInfoSchema, type MergeNeedleOptsSchema } from "../../schema/util.mjs";
import { RetryableError } from '../errors.mts';
import { createLogger } from "../logger.mts";
import { mergeNeedleOpts } from "./mergeNeedleOpts.mts";

type NeedleOptionsInput = Parameters<MergeNeedleOptsSchema>[1]
type GetDBInfoReturn = Awaited<ReturnType<GetDBInfoSchema>>

export const getDBInfo = GetDBInfo.implementAsync(async (config) => {
  const logger = createLogger(config);
  const url = `${config.couch}`;
  const opts: NeedleOptionsInput = {
    json: true,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  const mergedOpts = mergeNeedleOpts(config, opts);
  let resp: NeedleResponse | undefined;
  try {
    resp = await needle('get', url, mergedOpts);
  } catch (err) {
    logger.error('Error during get operation:', err);
    RetryableError.handleNetworkError(err);
  }

  if (!resp) {
    logger.error('No response received from get request');
    throw new RetryableError('no response', 503);
  }

  const result = resp.body as Record<string, unknown> & { reason?: string; };
  if (RetryableError.isRetryableStatusCode(resp.statusCode)) {
    logger.warn(`Retryable status code received: ${resp.statusCode}`);
    throw new RetryableError(result.reason ?? 'retryable error', resp.statusCode);
  }

  return result as GetDBInfoReturn;
});
