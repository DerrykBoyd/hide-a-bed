import assert from 'node:assert/strict'
import test, { suite } from 'node:test'
import type { CouchConfigInput } from '../schema/config.mjs'
import { createLogger, type Logger } from './logger.mts'

type TestConfig = CouchConfigInput & {
  _normalizedLogger?: Logger
}

const baseConfig = (): TestConfig => ({
  couch: 'http://localhost:5984'
})

suite('createLogger', () => {
  test('returns cached logger when present', () => {
    const cached: Logger = {
      error: () => { },
      warn: () => { },
      info: () => { },
      debug: () => { }
    }
    const config: TestConfig = {
      ...baseConfig(),
      _normalizedLogger: cached
    }

    const logger = createLogger(config)

    assert.strictEqual(logger, cached)
  })

  test('uses console logger when requested', () => {
    const errorCalls: unknown[][] = []
    const warnCalls: unknown[][] = []
    const infoCalls: unknown[][] = []
    const debugCalls: unknown[][] = []

    const originalError = console.error
    const originalWarn = console.warn
    const originalInfo = console.info
    const originalDebug = console.debug

    console.error = (...args: unknown[]) => { errorCalls.push(args) }
    console.warn = (...args: unknown[]) => { warnCalls.push(args) }
    console.info = (...args: unknown[]) => { infoCalls.push(args) }
    console.debug = (...args: unknown[]) => { debugCalls.push(args) }

    try {
      const config: TestConfig = {
        ...baseConfig(),
        useConsoleLogger: true
      }

      const logger = createLogger(config)

      logger.error('boom')
      logger.warn('warn', 123)
      logger.info('info')
      logger.debug('debug')

      assert.strictEqual(config._normalizedLogger, logger)
      assert.deepStrictEqual(errorCalls, [['boom']])
      assert.deepStrictEqual(warnCalls, [['warn', 123]])
      assert.deepStrictEqual(infoCalls, [['info']])
      assert.deepStrictEqual(debugCalls, [['debug']])
    } finally {
      console.error = originalError
      console.warn = originalWarn
      console.info = originalInfo
      console.debug = originalDebug
    }
  })

  test('creates no-op logger when none provided', () => {
    const config = baseConfig()
    const logger = createLogger(config)

    assert.strictEqual(config._normalizedLogger, logger)
    assert.doesNotThrow(() => logger.error('noop'))
    assert.doesNotThrow(() => logger.warn('noop'))
    assert.doesNotThrow(() => logger.info('noop'))
    assert.doesNotThrow(() => logger.debug('noop'))
  })

  test('wraps function logger', () => {
    const calls: Array<{ level: string, args: unknown[] }> = []
    const fnLogger = (level: string, ...args: unknown[]) => {
      calls.push({ level, args })
    }

    const config: TestConfig = {
      ...baseConfig(),
      logger: fnLogger
    }

    const logger = createLogger(config)
    logger.info('hello', 42)
    logger.error('problem')

    assert.deepStrictEqual(calls, [
      { level: 'info', args: ['hello', 42] },
      { level: 'error', args: ['problem'] }
    ])
  })

  test('fills missing methods on object logger', () => {
    let warnCount = 0
    const config: TestConfig = {
      ...baseConfig(),
      logger: {
        warn: () => {
          warnCount++
        }
      }
    }

    const logger = createLogger(config)
    logger.warn('watch out')

    assert.strictEqual(warnCount, 1)
    assert.doesNotThrow(() => logger.error('ignored'))
    assert.doesNotThrow(() => logger.info('ignored'))
    assert.doesNotThrow(() => logger.debug('ignored'))
  })
})
