import { z } from 'zod'
import { CouchDoc } from '../couch.schema.mts'

export const LockDoc = CouchDoc.extend({
  type: z.literal('lock'),
  locks: z.string().describe('the document ID being locked'),
  lockedAt: z.string().describe('ISO timestamp when lock was created'),
  lockedBy: z.string().describe('username of who created the lock')
})
export interface LockDocSchema extends z.infer<typeof LockDoc> { }

export const LockOptions = z.object({
  enableLocking: z.boolean().prefault(true).describe('whether locking is enabled'),
  username: z.string().describe('username to attribute locks to')
})
export interface LockOptionsSchema extends z.infer<typeof LockOptions> { }
export interface LockOptionsInput extends z.input<typeof LockOptions> { }
