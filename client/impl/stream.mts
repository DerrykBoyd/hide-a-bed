import needle from 'needle'
import type { IncomingMessage } from 'node:http'
import Chain from 'stream-chain'
import Parser from 'stream-json/Parser.js'
import Pick from 'stream-json/filters/Pick.js'
import StreamArray from 'stream-json/streamers/StreamArray.js'
import { CouchConfig, type CouchConfigInput } from '../schema/config.mjs'
import { queryString } from './query.mts'
import { RetryableError } from './errors.mjs'
import { createLogger } from './logger.mjs'
import { mergeNeedleOpts } from './util.mjs'
import type { DefaultRowSchema, ViewOptions } from '../schema/query.mts'

type StreamArrayChunk<Row> = {
  key: number
  value: Row
}

type OnRow = (row: DefaultRowSchema) => void
type HttpMethod = 'GET' | 'POST'

export async function queryStream(
  rawConfig: CouchConfigInput,
  view: string,
  options: ViewOptions | undefined,
  onRow: OnRow
): Promise<void> {
  return new Promise((resolve, reject) => {
    const config = CouchConfig.parse(rawConfig)
    const logger = createLogger(config)
    logger.info(`Starting view query stream: ${view}`)
    logger.debug('Query options:', options)

    const queryOptions: ViewOptions = options ?? {}

    let method: HttpMethod = 'GET'
    let payload: Record<string, unknown> | null = null
    let qs = queryString(queryOptions, ['key', 'startkey', 'endkey', 'reduce', 'group', 'group_level', 'stale', 'limit'])
    logger.debug('Generated query string:', qs)

    if (typeof queryOptions.keys !== 'undefined') {
      const MAX_URL_LENGTH = 2000
      const keysAsString = `keys=${encodeURIComponent(JSON.stringify(queryOptions.keys))}`

      if (keysAsString.length + qs.length + 1 <= MAX_URL_LENGTH) {
        qs += (qs.length > 0 ? '&' : '') + keysAsString
      } else {
        method = 'POST'
        payload = { keys: queryOptions.keys }
      }
    }

    const url = `${config.couch}/${view}?${qs}`
    const opts = {
      json: true,
      headers: {
        'Content-Type': 'application/json'
      },
      parse_response: false as const
    }
    const mergedOpts = mergeNeedleOpts(config, opts)

    const parserPipeline = Chain.chain([
      new Parser(),
      new Pick({ filter: 'rows' }),
      new StreamArray()
    ])

    let rowCount = 0
    let settled = false

    const settleReject = (err: Error) => {
      if (settled) return
      settled = true
      reject(err)
    }

    const settleResolve = () => {
      if (settled) return
      settled = true
      resolve()
    }

    let request: ReturnType<typeof needle.get> | ReturnType<typeof needle.post> | null = null

    parserPipeline.on('data', (chunk: StreamArrayChunk<DefaultRowSchema>) => {
      try {
        rowCount++
        onRow(chunk.value)
      } catch (callbackErr) {
        const error = callbackErr instanceof Error ? callbackErr : new Error(String(callbackErr))
        parserPipeline.destroy(error)
        settleReject(error)
      }
    })

    parserPipeline.on('error', (err: Error) => {
      logger.error('Stream parsing error:', err)
      parserPipeline.destroy()
      settleReject(new Error(`Stream parsing error: ${err.message}`, { cause: err }))
    })

    parserPipeline.on('end', () => {
      logger.info(`Stream completed, processed ${rowCount} rows`)
      settleResolve()
    })

    request = method === 'GET'
      ? needle.get(url, mergedOpts)
      : needle.post(url, payload, mergedOpts)

    request.on('response', (response: IncomingMessage) => {
      logger.debug(`Received response with status code: ${response.statusCode}`)
      if (RetryableError.isRetryableStatusCode(response.statusCode)) {
        logger.warn(`Retryable status code received: ${response.statusCode}`)
        settleReject(new RetryableError('retryable error during stream query', response.statusCode))
      }
    })

    request.on('error', (err: NodeJS.ErrnoException) => {
      logger.error('Network error during stream query:', err)
      parserPipeline.destroy(err)
      try {
        RetryableError.handleNetworkError(err)
      } catch (retryErr) {
        settleReject(retryErr as Error)
        return
      }
      settleReject(err)
    })

    request.pipe(parserPipeline)
  })
}
