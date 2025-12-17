import { z } from 'zod'
import { CouchConfig, NeedleBaseOptions, NeedleOptions } from './config.mjs'

/** example of dbinfo
 * {
"db_name": "plumber",
"doc_count": 12712696,
"doc_del_count": 43,
"update_seq": 23873804,
"purge_seq": 0,
"compact_running": false,
"disk_size": 287263179958,
"data_size": 144202211934,
"instance_start_time": "1741900082995812",
"disk_format_version": 6,
"committed_update_seq": 23873801
} */

export const DBInfo = z.looseObject({
  db_name: z.string(),
  doc_count: z.number(),
  update_seq: z.number(),
  compact_running: z.boolean().nullish(),
  disk_size: z.number().nullish(),
  committed_update_seq: z.number().nullish()
})

export const GetDBInfo = z.function({ input: [CouchConfig], output: z.promise(DBInfo) })
/** @typedef { z.infer<typeof GetDBInfo> } GetDBInfoSchema */

export const GetDBInfoBound = z.function({ input: [], output: z.promise(DBInfo) })
/** @typedef { z.infer<typeof GetDBInfoBound> } GetDBInfoBoundSchema */

export const MergeNeedleOpts = z
  .function({ input: [CouchConfig, NeedleBaseOptions], output: NeedleOptions })
/** @typedef { z.infer<typeof MergeNeedleOpts> } MergeNeedleOptsSchema */
