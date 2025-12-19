import assert from 'node:assert/strict'
import test from 'node:test'
import { spawn } from 'node:child_process'
import needle from 'needle'
import { TrackedEmitter } from './impl/trackedEmitter.mjs'
import { bindConfig, bulkSaveTransaction, get } from './index.mts'
import { setTimeout } from 'node:timers/promises'

const PORT = 8985
const DB_URL = `http://localhost:${PORT}/test-db`
const config: Parameters<typeof get>[0] = {
  couch: DB_URL,
  bindWithRetry: true,
  logger: (level: string, ...args: any[]) => {
    console.log(`[${level.toUpperCase()}]`, ...args)
  }
};

let server: any = null

test('full db tests', async t => {
  console.log('Starting PouchDB Server...')
  server = spawn('node_modules/.bin/pouchdb-server', ['--in-memory', '--port', PORT.toString()], { stdio: 'inherit' })
  await setTimeout(1000) // wait for server to start
  await needle('put', DB_URL, null)
  console.log('PouchDB Server started and database created at', DB_URL)
  t.after(() => { server?.kill() })

  
  const db = bindConfig(config)
  
  await t.test('simple get/put', async () => {
    const doc = await db.put({ _id: 'test-doc', data: 'hello world' })
    assert.ok(doc.ok, 'Document created')
    const fetched = await db.get('test-doc')
    assert.strictEqual(fetched.data, 'hello world', 'Fetched document matches')
  })
  await t.test('get with no document', async () => {
    const notThereDoc = await get(config, 'test-doc-not-there')
    assert.strictEqual(notThereDoc, null)
  })
  await t.test('override config with different options', async () => {
    try {
      await db.options({ throwOnGetNotFound: true }).get('test-doc-not-there-override')
      assert.fail('should have thrown')
    } catch (e: any) {
      console.error(e)
      assert.strictEqual(e.name, 'NotFoundError')
    }
  })
  await t.test('get with no document and throwOnGetNotFound', async () => {
    const _config = { couch: DB_URL, throwOnGetNotFound: true }
    try {
      await get(_config, 'test-doc-not-there')
      assert.fail('should have thrown')
    } catch (e: any) {
      console.log(e.message)
      assert.strictEqual(e.name, 'NotFoundError')
    }
  })
  await t.test('put with bad rev', async () => {
    const doc = { _id: 'notThereDoc', _rev: '32-does-not-compute' }
    const notThereDoc = await db.put(doc)
    assert.ok(!notThereDoc.ok)
    assert.strictEqual(notThereDoc.error, 'conflict')
    console.log(notThereDoc)
  })
  await t.test('bulk get, including one doc that does not exist', async () => {
    const results = await db.bulkGet(['test-doc', 'notThereDoc'])
    assert.strictEqual(results.rows.length, 2, 'two rows returned')
    assert.strictEqual(results.rows[0].id, 'test-doc')
    assert.strictEqual(results.rows[1].error, 'not_found')
    console.log(results)
  })
  let _rev: string | null | undefined = null
  await t.test('a transaction', async () => {
    const docs = [{ _id: 'a', data: 'something' }]
    const resp = await bulkSaveTransaction(config, 'random', docs)
    assert.strictEqual(resp.length, 1, 'one response')
    assert.strictEqual(resp[0].ok, true, 'response ok')
    _rev = resp[0].rev
    assert.ok(resp)
  })
  await t.test('a transaction with a bad initial rev', async () => {
    try {
      const docs = [{ _id: 'a', data: 'something' }, { _id: 'b', data: 'new doc' }]
      await bulkSaveTransaction(config, 'random-1', docs)
      assert.fail('should have thrown')
    } catch (e) {
      assert.ok(e)
    }
  })
  let b_rev: string | null | undefined = null
  await t.test('a new and an existing doc', async () => {
    const docs = [{ _id: 'a', data: 'something', _rev }, { _id: 'b', data: 'new doc' }]
    const resp = await bulkSaveTransaction(config, 'random-2', docs)
    assert.ok(resp)
    assert.strictEqual(resp.length, 2, 'one response')
    assert.strictEqual(resp[0].ok, true, 'response ok')
    _rev = resp[0].rev
    b_rev = resp[1].rev
    assert.strictEqual(resp[1].ok, true, 'response ok')
    assert.ok(resp[0].rev?.startsWith('2-'), 'second rev saved')
  })

  await t.test('testing a rollback where one doc was interfered with in the transaction', async () => {
    const _config = config
    const emitter = new TrackedEmitter({ delay: 300 })
    config._emitter = emitter
    const docs = [
      { _id: 'a', data: 'before-rollback', _rev }, // this doc gets interfered with in-between commit - so will be 'interfered'
      { _id: 'rollback2', data: 'new doc' }, // this doc will get removed
      { _id: 'b', _rev: b_rev, data: 'should-not-be' } // this will not be committed. result will be from b doc above 'new doc'
    ]
    emitter.on('transaction-started', async txnDoc => {
      assert.strictEqual(txnDoc._id, 'txn:random-3', 'transaction id matches')
      // lets change something!
      docs[0].data = 'interfered'
      const interfereResp = await db.put(docs[0])
      assert.ok(interfereResp.ok, 'interfered with the transaction')
    })
    try {
      await bulkSaveTransaction(_config, 'random-3', docs)
      assert.fail('should have thrown')
    } catch (e: any) {
      assert.ok(e)
      console.log(e)
      assert.strictEqual(e.name, 'TransactionRollbackError', 'correct error type thrown')

      // lets make sure doc a has data from before, and
      const finalDocs = await db.bulkGet(['a', 'rollback2', 'b'])
      assert.strictEqual(finalDocs.rows.length, 3, 'two rows returned')
      assert.strictEqual(finalDocs.rows[0].doc.data, 'interfered', 'doc has the interfered data')
      assert.ok(!finalDocs.rows[1].doc, 'doc b was deleted, and not saved')
      assert.strictEqual(finalDocs.rows[2].doc.data, 'new doc', 'doc b was rolled back')
    }
  })
  await t.test('TransactionVersionConflictError test', async () => {
    // First create a doc
    await db.put({ _id: 'conflict-test', data: 'original' })
    // Then try to update it with wrong rev
    try {
      await bulkSaveTransaction(config, 'conflict-error', [
        { _id: 'conflict-test', _rev: 'wrong-rev', data: 'new' }
      ])
      assert.fail('should have thrown TransactionVersionConflictError')
    } catch (e: any) {
      assert.strictEqual(e.name, 'TransactionVersionConflictError', 'correct error type thrown')
      assert.deepStrictEqual(e.conflictingIds, ['conflict-test'], 'includes conflicting doc ids')
    }
  })
  await t.test('TransactionVersionConflictError test 2, new doc with _rev', async () => {
    try {
      // Try to update a doc that doesn't exist with a rev
      await bulkSaveTransaction(config, 'bulk-error', [
        { _id: 'nonexistent', _rev: '1-abc', data: 'test' }
      ])
      assert.fail('should have thrown TransactionVersionConflictError')
    } catch (e: any) {
      assert.strictEqual(e.name, 'TransactionVersionConflictError', 'correct error type thrown')
    }
  })

  await t.test('locking tests', async t => {
    const lockOptions = {
      enableLocking: true,
      username: 'testUser'
    }

    // Test successful lock creation
    await t.test('create lock', async () => {
      const locked = await db.createLock('doc-to-lock', lockOptions)
      assert.ok(locked, 'Lock was created successfully')

      // Verify lock document exists
      const lockDoc = await db.get('lock-doc-to-lock')
      assert.ok(lockDoc, 'Lock document exists')
      assert.strictEqual(lockDoc.type, 'lock', 'Document is a lock')
      assert.strictEqual(lockDoc.locks, 'doc-to-lock', 'Correct document is locked')
      assert.strictEqual(lockDoc.lockedBy, 'testUser', 'Lock owned by correct user')
    })

    // Test lock conflict
    await t.test('lock conflict', async () => {
      const locked = await db.createLock('doc-to-lock', lockOptions)
      assert.ok(!locked, 'Second lock attempt failed')
    })

    // Test unlock
    await t.test('unlock document', async () => {
      await db.removeLock('doc-to-lock', lockOptions)
      const lockDoc = await db.get('lock-doc-to-lock')
      assert.ok(!lockDoc, 'Lock document was removed')
    })

    // Test unlock by different user
    await t.test('unlock by different user', async () => {
      // Create lock as testUser
      await db.createLock('doc-to-lock', lockOptions)

      // Try to unlock as different user
      const differentUserOptions = {
        ...lockOptions,
        username: 'differentUser'
      }
      await db.removeLock('doc-to-lock', differentUserOptions)

      // Verify lock still exists
      const lockDoc = await db.get('lock-doc-to-lock')
      assert.ok(lockDoc, 'Lock still exists')
      assert.strictEqual(lockDoc.lockedBy, 'testUser', 'Lock still owned by original user')
    })

    // Test with locking disabled
    await t.test('disabled locking', async () => {
      const disabledOptions = {
        ...lockOptions,
        enableLocking: false
      }
      const locked = await db.createLock('doc-to-lock-2', disabledOptions)
      assert.ok(locked, 'Lock creation returns true when disabled')

      const lockDoc = await db.get('lock-doc-to-lock-2')
      assert.ok(!lockDoc, 'No lock document created when disabled')
    })

    await t.test('empty keys on bulkGet', async () => {
      const results = await db.bulkGet([])
      console.log(results)
      assert.deepStrictEqual(results.rows, [], 'empty array returns empty object')
    })

    await t.test('get db info', async () => {
      const results = await db.getDBInfo()
      assert.ok(results)
      assert.strictEqual(results.db_name, 'test-db')
    })
  })
  await t.test('bulkRemove', async () => {
    const results = await db.bulkRemove(['test-doc-never51'])
    assert.ok(results)
    assert.strictEqual(results.length, 0) // not an actual doc

    const doc = await db.put({ _id: 'test-doc-never51', data: 'hello world' })
    assert.ok(doc.ok, 'Document created')
    const results2 = await db.bulkRemove(['test-doc-never51'])
    assert.ok(results2)
    assert.strictEqual(results2.length, 1)
  })
  await t.test('bulkRemoveMap', async () => {
    const results = await db.bulkRemoveMap(['test-doc-never52'])
    assert.ok(results)
    assert.strictEqual(results.length, 0) // not an actual doc

    const doc = await db.put({ _id: 'test-doc-never52', data: 'hello world' })
    assert.ok(doc.ok, 'Document created')
    const results2 = await db.bulkRemoveMap(['test-doc-never52'])
    assert.ok(results2)
    assert.strictEqual(results2.length, 1)
  })
  await t.test('bulk save', async () => {
    // make sure docs with no id are accepted
    const docs = [{ first: true }, { _id: 'bbbbb', second: true }]
    const results = await db.bulkSave(docs)
    assert.strictEqual(results.length, 2, 'two rows returned')
    assert.ok(results[0].id)
    assert.strictEqual(results[1].id, 'bbbbb', 'id matches')
  })
  await t.test('a view query with only keys', async () => {
    const docs = [{ _id: 'query-1' }, { _id: 'query-2', included: true }, { _id: 'query-3' }]
    // create a view
    await db.put({ _id: '_design/test', views: { test: { map: 'function(doc) { if (!doc.included) return; emit(doc._id, null); }' } } })
    await db.bulkSave(docs)
    const queryResults = await db.query('_design/test/_view/test', { keys: ['query-2'] })
    assert.strictEqual(queryResults.rows?.length, 1, 'one row returned')
    assert.strictEqual(queryResults.rows[0].key, 'query-2', 'key matches')
  })
  await t.test('all docs query', async () => {
    const query_results = await db.query('_all_docs', { })
    assert.ok(query_results.rows)
  })
  await t.test('not found doc', async () => {
    // should not throw
    const notFound = await db.get('never-51st')
    console.log('found status', notFound)
  })

  await t.test('remove test', async () => {
    // First create a document to delete
    const doc = await db.put({ _id: 'delete-test-doc', data: 'to be deleted' })
    assert.ok(doc.ok, 'Document created successfully')

    // Verify the document exists
    const fetchedDoc = await db.get('delete-test-doc')
    assert.strictEqual(fetchedDoc.data, 'to be deleted', 'Document exists and has correct data')

    // Delete the document
    const deleteResult = await db.remove('delete-test-doc', fetchedDoc._rev)
    assert.ok(deleteResult.ok, 'Document deleted successfully')

    // Verify the document no longer exists
    const deletedDoc = await db.get('delete-test-doc')
    assert.strictEqual(deletedDoc, null, 'Document was successfully deleted')
  })
})
