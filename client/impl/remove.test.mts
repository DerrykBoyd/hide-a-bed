import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import test, { suite } from 'node:test'
import needle from 'needle'
import { setTimeout as delay } from 'node:timers/promises'
import type { CouchConfigInput } from '../schema/config.mts'
import { remove } from './remove.mts'
import { RetryableError } from './utils/errors.mts'

const PORT = 8995
const DB_URL = `http://localhost:${PORT}/remove-test`

const baseConfig: CouchConfigInput = {
  couch: DB_URL
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

async function getDoc(id: string) {
  return needle('get', `${DB_URL}/${id}`, null, { json: true })
}

suite('remove', () => {
  test('it should throw if provided config is invalid', async () => {
    await assert.rejects(async () => {
      // @ts-expect-error testing invalid config
      await remove({ couch: DB_URL, useConsoleLogger: true, unexpected: true }, 'doc-invalid-config', '1-invalid')
    })
  })

  test('integration with pouchdb-server', async t => {
    const server = spawn('node_modules/.bin/pouchdb-server', ['--in-memory', '--port', PORT.toString()], { stdio: 'inherit' })
    await delay(2000)
    await needle('put', DB_URL, null)
    t.after(() => { server.kill() })

    await t.test('removes an existing document', async () => {
      const { rev } = await saveDoc('remove-doc-1', { kind: 'test', count: 1 })

      const result = await remove(baseConfig, 'remove-doc-1', rev)
      assert.strictEqual(result.ok, true)
      assert.strictEqual(result.id, 'remove-doc-1')
      assert.strictEqual(result.statusCode, 200)

      const { statusCode, body } = await getDoc('remove-doc-1')
      assert.strictEqual(statusCode, 404)
      assert.strictEqual(body?.error, 'not_found')
    })

    await t.test('returns not found metadata when document is missing', async () => {
      const result = await remove(baseConfig, 'remove-doc-missing', '1-missing')
      assert.strictEqual(result.ok, false)
      assert.strictEqual(result.error, 'not_found')
      assert.strictEqual(result.statusCode, 404)
    })

    await t.test('propagates retryable network errors', async () => {
      const offlineConfig: CouchConfigInput = { couch: 'http://localhost:6553/offline-remove-db' }

      await assert.rejects(
        () => remove(offlineConfig, 'remove-doc-network', '1-offline'),
        (err: unknown) => err instanceof RetryableError && err.statusCode === 503
      )
    })
  })
})
