import { z } from "zod"
import { query } from "./query.mts"
import { bindConfig, queryStream } from "../index.mts"

const config = {
  couch: "http://localhost:5984/plumber",
  needleOpts: {
    username: "admin",
    password: "znh5qym.TKR2raw7yef",
  },
  logger: console,
} satisfies Parameters<typeof query>[0];

const res = await queryStream(
  config,
  '_all_docs',
  {
    include_docs: true,
    limit: 20,
    // validate: {
    //   docSchema: z.looseObject({
    //     _id: z.string(),
    //     _rev: z.string(),
    //     foo: z.string(),
    //   }),
    //   keySchema: z.string(),
    //   valueSchema: z.object(),
    // }
  }, (row) => {
    console.log('Row key:', row.key);
    console.log('Row value:', row.value);
    if (row.doc) {
      console.log('Row doc _id:', row.doc._id);
      console.log('Row doc foo:', row.doc.foo);
    }
  }
)

// res.rows.forEach((row) => {
//   row.key
//   row.value
//   if (row.doc) {
//     row.doc.values
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
  couch: "http://localhost:5984/hide-a-bed-test",
  bindWithRetry: true,
})

const boundRes = await bound.options({
  maxRetries: 5,
}).bulkGet(["test-doc"], {
  includeDocs: true, validate: {
    docSchema: z.object({
      _id: z.string(),
      accountUuid: z.string(),
      leadPersonUuid: z.string(),
    })
  }
})

boundRes.rows.forEach((row) => {
  row.key
  row.value
  if (row.doc) {
    console.log(row.doc.accountUuid + ' ' + row.doc.leadPersonUuid)
  }
})


