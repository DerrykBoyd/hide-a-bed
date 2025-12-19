// @ts-check
import needle from 'needle'
import { CouchConfig } from '../schema/config.mjs'
import { queryString } from './query.mts'
import { RetryableError } from './errors.mjs'
import { createLogger } from './logger.mjs'
import { mergeNeedleOpts } from './util.mjs'
import Chain from 'stream-chain'
import Parser from 'stream-json/Parser.js'
import Pick from 'stream-json/filters/Pick.js'
import StreamArray from 'stream-json/streamers/StreamArray.js'

/** @type { import('../schema/stream.mjs').SimpleViewQueryStreamSchema } queryStream */
export const queryStream = (rawConfig, view, options, onRow) => new Promise((resolve, reject) => {
  const config = CouchConfig.parse(rawConfig)
  const logger = createLogger(config)
  logger.info(`Starting view query stream: ${view}`)
  logger.debug('Query options:', options)

  if (!options) options = {}

  let method = 'GET'
  let payload = null
  let qs = queryString(options, ['key', 'startkey', 'endkey', 'reduce', 'group', 'group_level', 'stale', 'limit'])
  logger.debug('Generated query string:', qs)

  // If keys are supplied, issue a POST to circumvent GET query string limits
  if (typeof options.keys !== 'undefined') {
    const MAX_URL_LENGTH = 2000
    const keysAsString = `keys=${encodeURIComponent(JSON.stringify(options.keys))}`

    if (keysAsString.length + qs.length + 1 <= MAX_URL_LENGTH) {
      // If the keys are short enough, do a GET
      qs += (qs[0] === '?' ? '&' : '?') + keysAsString
    } else {
      method = 'POST'
      payload = { keys: options.keys }
    }
  }

  const url = `${config.couch}/${view}?${qs.toString()}`
  const opts = {
    json: true,
    headers: {
      'Content-Type': 'application/json'
    },
    parse_response: false // Keep as stream
  }
  const mergedOpts = mergeNeedleOpts(config, opts)

  const parserPipeline = Chain.chain([
    new Parser(),
    new Pick({ filter: 'rows' }),
    new StreamArray()
  ])

  let rowCount = 0
  let settled = false
  const settleReject = /** @param {any} err */ err => {
    if (settled) return
    settled = true
    reject(err)
  }
  const settleResolve = () => {
    if (settled) return
    settled = true
    resolve(undefined)
  }

  /** @type {import('needle').ReadableStream} */let request

  parserPipeline.on('data', /** @param {{key:number,value:any}} chunk */ chunk => {
    try {
      rowCount++
      onRow(chunk.value)
    } catch (callbackErr) {
      const err = callbackErr instanceof Error ? callbackErr : new Error(String(callbackErr))
      parserPipeline.destroy(err)
      settleReject(err)
    }
  })

  parserPipeline.on('error', /** @param {Error} err */ err => {
    logger.error('Stream parsing error:', err)
    settleReject(new Error(`Stream parsing error: ${err.message}`, { cause: err }))
  })

  parserPipeline.on('end', () => {
    logger.info(`Stream completed, processed ${rowCount} rows`)
    settleResolve()
  })

  request = method === 'GET'
    ? needle.get(url, mergedOpts)
    : needle.post(url, payload, mergedOpts)

  request.on('response', response => {
    logger.debug(`Received response with status code: ${response.statusCode}`)
    if (RetryableError.isRetryableStatusCode(response.statusCode)) {
      logger.warn(`Retryable status code received: ${response.statusCode}`)
      settleReject(new RetryableError('retryable error during stream query', response.statusCode))
      // req.abort()
    }
  })

  request.on('error', err => {
    logger.error('Network error during stream query:', err)
    parserPipeline.destroy(err)
    try {
      RetryableError.handleNetworkError(err)
    } catch (retryErr) {
      settleReject(retryErr)
      return
    }
    settleReject(err)
  })

  request.pipe(parserPipeline)
})
