import { z } from "zod"
import { query } from "./query.mts"
import { get, queryStream } from "../index.mts"
import { bindConfig } from './bindConfig.mts';

const config = {
  couch: "http://localhost:5984/plumber",
  needleOpts: {
    username: "admin",
    password: "znh5qym.TKR2raw7yef",
  },
  logger: console,
} satisfies Parameters<typeof query>[0];

// const resStream = await queryStream(
//   config,
//   '_all_docs',
//   {
//     include_docs: true,
//     limit: 20,
//     // validate: {
//     //   docSchema: z.looseObject({
//     //     _id: z.string(),
//     //     _rev: z.string(),
//     //     foo: z.string(),
//     //   }),
//     //   keySchema: z.string(),
//     //   valueSchema: z.object(),
//     // }
//   }, (row) => {
//     console.log('Row key:', row.key);
//     console.log('Row value:', row.value);
//     if (row.doc) {
//       console.log('Row doc _id:', row.doc._id);
//       console.log('Row doc foo:', row.doc.foo);
//     }
//   }
// )

// const res = await query(
//   config,
//   '_all_docs',
//   {
//     include_docs: true,
//     limit: 20,
//     validate: {
//       docSchema: z.looseObject({
//         _id: z.string(),
//         _rev: z.string(),
//         foo: z.string(),
//       }),
//       keySchema: z.string(),
//       valueSchema: z.number(),
//     }
//   }
// )

// res.rows.forEach((row) => {
//   row.key
//   row.value
//   if (row.doc) {
//     row.doc.foo
//   }
// })

// const boundOptions = bindConfig({
//   ...config,
//   couch: "http://localhost:5984/hide-a-bed-test",
//   bindWithRetry: true,
// })

// const boundRes2 = await boundOptions.query(
//   '_all_docs',
//   {
//     include_docs: true,
//     limit: 10,
//     validate: {
//       docSchema: z.looseObject({
//         _id: z.string(),
//         _rev: z.string(),
//         foo: z.string(),
//         nested: z.object({
//           a: z.number(),
//           b: z.string(),
//         })
//       }),
//       keySchema: z.string(),
//       valueSchema: z.number(),
//     }
//   }
// )

// boundRes2.rows.forEach((row) => {
//   row.key
//   row.value
//   if (row.doc) {
//     row.doc.foo
//   }
// })

// const res2 = await query(
//   config,
//   '_all_docs')

// res2.rows.forEach((row) => {
//   row.doc
//   row.key
//   row.value
// })

const bound = bindConfig({
  ...config,
  couch: "http://localhost:5984/plumber",
  bindWithRetry: true,
})

// const boundGetRes = await bound.options({
//   maxRetries: 5,
// }).get("test-doc", {
//   validate: {
//     docSchema: z.object({
//       _id: z.string(),
//       accountUuid: z.string(),
//       leadPersonUuid: z.string(),
//       test: z.object({
//         nested: z.string(),
//       })
//     })
//   }
// })

// boundGetRes?.test.nested

// const getRes = await get(config, "test-doc", {
//   validate: {
//     docSchema: z.object({
//       _id: z.string(),
//       accountUuid: z.string(),
//       leadPersonUuid: z.string(),
//       some: z.object({
//         nested: z.string(),
//       })
//     })
//   }
// })

// getRes?.some.nested

// const bulkGetRes = await bound.bulkGet(["test-doc"], {
//   validate: {
//     docSchema: z.object({
//       _id: z.string(),
//       accountUuid: z.string(),
//       leadPersonUuid: z.string(),
//       test: z.object({
//         nested: z.string(),
//       })
//     })
//   }
// })

// bulkGetRes.rows.forEach((row) => {
//   console.log('bulkGetRes row doc test.nested:', row.doc?.test.nested);
// })


/**
 * Things todo:
 * - add lots more tests
 * - move remaining zod function definitions to normal function with internal validation for cleaner type hints
 * - organize exports and types better
 * - maybe add configuration for what to do on validation errors (throw, skip, log, etc)
 * - wish: move to standard schema for user validation and drop zod peer dependency?
 */

const info = await bound.getDBInfo()
console.log('DB Info:', info)