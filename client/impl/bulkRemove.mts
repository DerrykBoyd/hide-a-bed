import type { z } from 'zod';
import { BulkRemove, BulkRemoveMap } from '../schema/bulk.mts';
import { CouchDoc } from '../schema/couch.schema.mts';
import { bulkGet } from './bulkGet.mts';
import { bulkSave } from './bulkSave.mts';
import { createLogger } from './logger.mts';
import { remove } from './remove.mts';

export const bulkRemove = BulkRemove.implementAsync(async (config, ids) => {
  const logger = createLogger(config);
  logger.info(`Starting bulk remove for ${ids.length} documents`);
  const resp = await bulkGet(config, ids);
  /** @type { Array<import('../schema/couch.schema.mts').CouchDocSchema> } toRemove */
  const toRemove: Array<z.infer<typeof CouchDoc>> = [];
  resp.rows?.forEach(row => {
    if (!row.doc) return;
    try {
      const d = CouchDoc.parse(row.doc);
      d._deleted = true;
      toRemove.push(d);
    } catch (e) {
      logger.warn(`Invalid document structure in bulk remove: ${row.id}`, e);
    }
  });
  if (!toRemove.length) return [];
  const result = await bulkSave(config, toRemove);
  return result;
});

export const bulkRemoveMap = BulkRemoveMap.implementAsync(async (config, ids) => {
  const logger = createLogger(config)
  logger.info(`Starting bulk remove map for ${ids.length} documents`)

  const { rows } = await bulkGet(config, ids, { includeDocs: false })

  const results = []
  for (const row of rows || []) {
    try {
      if (!row.value?.rev) throw new Error(`no rev found for doc ${row.id}`)
      if (!row.id) { throw new Error(`no id found for doc ${row}`) }

      const result = await remove(config, row.id, row.value.rev)
      results.push(result)
    } catch (e) {
      logger.warn(`Error removing a doc in bulk remove map: ${row.id}`, e)
    }
  }
  return results
})

