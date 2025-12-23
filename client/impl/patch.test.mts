import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import test, { suite } from 'node:test'
import needle from 'needle'
import { setTimeout as delay } from 'node:timers/promises'
import type { CouchConfigInput } from '../schema/config.mts'
import { get } from './get.mts'
import { patch, patchDangerously } from './patch.mts'

const PORT = 8994
const DB_URL = `http://localhost:${PORT}/patch-test`

const baseConfig: CouchConfigInput = {
  couch: DB_URL,
  initialDelay: 10,
  maxRetries: 2,
  backoffFactor: 1.2
}

type DocBody = Record<string, unknown>

async function saveDoc(id: string, body: DocBody) {
  const response = await needle('put', `${DB_URL}/${id}`, {
    _id: id,
    ...body
  }, { json: true })

  if (response.statusCode !== 201 && response.statusCode !== 200) {
    throw new Error(`Failed to save document ${id}: ${response.statusCode}`)
  }

  return response.body as { rev: string }
}

suite('patch', () => {
  test("it will throw if provided config is invalid", async () => {
    await assert.rejects(
      async () => {
        // @ts-expect-error testing invalid config
        await patch({ notAnOption: true, couch: DB_URL, useConsoleLogger: true }, 'doc1', { foo: 'bar' })
      }
    )

    await assert.rejects(
      async () => {
        // @ts-expect-error testing invalid config
        await patchDangerously({ anotherBadOption: 123, couch: DB_URL, useConsoleLogger: true }, 'doc1', { foo: 'bar' })
      }
    )
  })

  test("patch should throw if document revision is not provided", async () => {
    await assert.rejects(
      async () => {
        // @ts-expect-error testing missing _rev
        await patch(baseConfig, 'doc-no-rev', { foo: 'bar' })
      },
      {
        message: /_rev is required for patch operations/
      }
    )
  })

  test('integration with pouchdb-server', async t => {
    const server = spawn('node_modules/.bin/pouchdb-server', ['--in-memory', '--port', PORT.toString()], { stdio: 'inherit' })
    await delay(2000)
    await needle('put', DB_URL, null)
    t.after(() => { server.kill() })

    const initial = await saveDoc('patch-doc', { message: 'original' })

    await t.test('patch updates document when revision matches', async () => {
      const result = await patch(baseConfig, 'patch-doc', { _rev: initial.rev, message: 'patched', updated: true })
      assert.ok(result.ok)
      assert.ok(result.rev)

      const doc = await get(baseConfig, 'patch-doc')
      assert.strictEqual(doc?.message, 'patched')
      assert.strictEqual(doc?.updated, true)
    })

    await t.test('patch returns conflict on stale revision', async () => {
      const current = await get(baseConfig, 'patch-doc')
      const staleRev = initial.rev

      const conflict = await patch(baseConfig, 'patch-doc', { _rev: staleRev, message: 'should-fail' })
      assert.strictEqual(conflict.ok, false)
      assert.strictEqual(conflict.statusCode, 409)
      assert.strictEqual(conflict.error, 'conflict')

      const doc = await get(baseConfig, 'patch-doc')
      assert.strictEqual(doc?.message, current?.message)
    })

    await t.test('patchDangerously merges properties without revision', async () => {
      const result = await patchDangerously(baseConfig, 'patch-doc', { description: 'dangerously updated' })
      assert.ok(result?.ok)

      const doc = await get(baseConfig, 'patch-doc')
      assert.strictEqual(doc?.description, 'dangerously updated')
    })

    await t.test('patchDangerously returns not_found when document missing', async () => {
      const response = await patchDangerously(baseConfig, 'missing-doc', { message: 'noop' })
      assert.strictEqual(response?.ok, false)
      assert.strictEqual(response?.statusCode, 404)
      assert.strictEqual(response?.error, 'not_found')
    })

    await t.test('patchDangerously reports failure after exhausting retries', async () => {
      const doc = await get(baseConfig, 'patch-doc')
      const conflictConfig: CouchConfigInput = {
        ...baseConfig,
        maxRetries: 1,
        initialDelay: 1,
        backoffFactor: 1
      }

      const response = await patchDangerously(conflictConfig, 'patch-doc', { _rev: initial.rev, conflicted: true })
      assert.strictEqual(response?.ok, false)
      assert.strictEqual(response?.statusCode, 500)
      assert.match(response?.error ?? '', /Failed to patch after 1 attempts/)

      const current = await get(baseConfig, 'patch-doc')
      assert.strictEqual(current?.conflicted, undefined)
      assert.strictEqual(current?._rev, doc?._rev)
    })
  })
})
