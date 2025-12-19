import type { CouchConfigInput } from '../schema/config.mjs'

export type LoggerMethod = (...args: unknown[]) => void

export type Logger = {
  error: LoggerMethod
  warn: LoggerMethod
  info: LoggerMethod
  debug: LoggerMethod
}

type FunctionLogger = (level: keyof Logger, ...args: unknown[]) => void

type LoggerConfig = CouchConfigInput & {
  _normalizedLogger?: Logger
}

const noop: LoggerMethod = () => { }

const createConsoleLogger = (): Logger => ({
  error: (...args) => console.error(...args),
  warn: (...args) => console.warn(...args),
  info: (...args) => console.info(...args),
  debug: (...args) => console.debug(...args)
})

const createNoopLogger = (): Logger => ({
  error: noop,
  warn: noop,
  info: noop,
  debug: noop
})

export function createLogger(config: LoggerConfig): Logger {
  if (config._normalizedLogger) {
    return config._normalizedLogger
  }

  if (!config.logger) {
    const normalized = config.useConsoleLogger ? createConsoleLogger() : createNoopLogger()
    config._normalizedLogger = normalized
    return normalized
  }

  if (typeof config.logger === 'function') {
    const loggerFn = config.logger as FunctionLogger
    const normalized: Logger = {
      error: (...args) => loggerFn('error', ...args),
      warn: (...args) => loggerFn('warn', ...args),
      info: (...args) => loggerFn('info', ...args),
      debug: (...args) => loggerFn('debug', ...args)
    }
    config._normalizedLogger = normalized
    return normalized
  }

  const loggerObj = config.logger as Partial<Logger>
  const normalized: Logger = {
    error: loggerObj.error ?? noop,
    warn: loggerObj.warn ?? noop,
    info: loggerObj.info ?? noop,
    debug: loggerObj.debug ?? noop
  }
  config._normalizedLogger = normalized
  return normalized
}
