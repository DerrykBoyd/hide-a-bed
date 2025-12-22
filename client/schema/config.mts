import { z } from 'zod'

const anyArgs = z.array(z.any())

const LoggerSchema = z.object({
  error: z.function({ input: anyArgs, output: z.void() }).optional(),
  warn: z.function({ input: anyArgs, output: z.void() }).optional(),
  info: z.function({ input: anyArgs, output: z.void() }).optional(),
  debug: z.function({ input: anyArgs, output: z.void() }).optional()
}).or(z.function({ input: anyArgs, output: z.void() }))

export const NeedleBaseOptions = z.object({
  json: z.boolean(),
  headers: z.record(z.string(), z.string()),
  parse_response: z.boolean().optional()
})
export type NeedleBaseOptionsSchema = z.infer<typeof NeedleBaseOptions>

export const NeedleOptions = z.object({
  json: z.boolean().optional(),
  compressed: z.boolean().optional(),
  follow_max: z.number().optional(),
  follow_set_cookie: z.boolean().optional(),
  follow_set_referer: z.boolean().optional(),
  follow: z.number().optional(),
  timeout: z.number().optional(),
  read_timeout: z.number().optional(),
  parse_response: z.boolean().optional(),
  decode: z.boolean().optional(),
  parse_cookies: z.boolean().optional(),
  cookies: z.record(z.string(), z.string()).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  auth: z.enum(['auto', 'digest', 'basic']).optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  proxy: z.string().optional(),
  agent: z.any().optional(),
  rejectUnauthorized: z.boolean().optional(),
  output: z.string().optional(),
  parse: z.boolean().optional(),
  multipart: z.boolean().optional(),
  open_timeout: z.number().optional(),
  response_timeout: z.number().optional(),
  keepAlive: z.boolean().optional()
})

export const CouchConfig = z.strictObject({
  backoffFactor: z.number().optional().default(2).describe('multiplier for exponential backoff'),
  bindWithRetry: z.boolean().optional().default(true).describe('should we bind with retry'),
  couch: z.string().describe('the url of the couch db'),
  initialDelay: z.number().optional().default(1000).describe('initial retry delay in milliseconds'),
  logger: LoggerSchema.optional().describe('logging interface supporting winston-like or simple function interface'),
  maxRetries: z.number().optional().default(3).describe('maximum number of retry attempts'),
  needleOpts: NeedleOptions.optional(),
  throwOnGetNotFound: z.boolean().optional().default(false).describe('if a get is 404 should we throw or return undefined'),
  useConsoleLogger: z.boolean().optional().default(false).describe('turn on console as a fallback logger'),
  "~emitter": z.any().optional().describe('emitter for events'),
  "~normalizedLogger": z.any().optional(), // Internal property for caching normalized logger
}).describe('The std config object')

export interface CouchConfig extends z.infer<typeof CouchConfig> { }
export interface CouchConfigInput extends z.input<typeof CouchConfig> { }

export const CouchDBInfo = z.looseObject({
  cluster: z.object({
    n: z.number().describe('Replicas. The number of copies of every document.').optional(),
    q: z.number().describe('Shards. The number of range partitions.').optional(),
    r: z.number().describe('Read quorum. The number of consistent copies of a document that need to be read before a successful reply.').optional(),
    w: z.number().describe('Write quorum. The number of copies of a document that need to be written before a successful reply.').optional(),
  }).optional(),
  compact_running: z.boolean().describe('Set to true if the database compaction routine is operating on this database.').optional(),
  db_name: z.string().describe('The name of the database.'),
  disk_format_version: z.number().describe('The version of the physical format used for the data when it is stored on disk.').optional(),
  doc_count: z.number().describe('A count of the documents in the specified database.').optional(),
  doc_del_count: z.number().describe('Number of deleted documents').optional(),
  instance_start_time: z.string().optional(),
  purge_seq: z.string().describe('An opaque string that describes the purge state of the database. Do not rely on this string for counting the number of purge operations.').optional(),
  sizes: z.object({
    active: z.number().describe('The size of live data inside the database, in bytes.').optional(),
    external: z.number().describe('The uncompressed size of database contents in bytes.').optional(),
    file: z.number().describe('The size of the database file on disk in bytes. Views indexes are not included in the calculation.').optional(),
  }).optional(),
  update_seq: z.string().or(z.number()).describe('An opaque string that describes the state of the database. Do not rely on this string for counting the number of updates.').optional(),
  props: z.object({
    partitioned: z.boolean().describe('If present and true, this indicates that the database is partitioned.').optional()
  }).optional()
})
export type CouchDBInfo = z.infer<typeof CouchDBInfo>