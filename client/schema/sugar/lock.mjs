import { z } from 'zod'
import { CouchConfig } from '../config.mjs'
import { CouchDoc } from '../crud.mjs'

export const Lock = CouchDoc.extend({
  type: z.literal('lock'),
  locks: z.string().describe('the document ID being locked'),
  lockedAt: z.string().describe('ISO timestamp when lock was created'),
  lockedBy: z.string().describe('username of who created the lock')
})
/** @typedef { z.infer<typeof Lock> } LockSchema */

export const LockOptions = z.object({
  enableLocking: z.boolean().prefault(true).describe('whether locking is enabled'),
  username: z.string().describe('username to attribute locks to')
})
/** @typedef { z.infer<typeof LockOptions> } LockOptionsSchema */

export const CreateLock = z.function({ input: [CouchConfig, z.string().describe('document ID to lock'), LockOptions], output: z.promise(z.boolean()) })
/** @typedef { z.infer<typeof CreateLock> } CreateLockSchema */
export const CreateLockBound = z.function({ input: [z.string().describe('document ID to lock'), LockOptions], output: z.promise(z.boolean()) })
/** @typedef { z.infer<typeof CreateLockBound> } CreateLockBoundSchema */

export const RemoveLock = z.function({ input: [CouchConfig, z.string().describe('document ID to unlock'), LockOptions], output: z.promise(z.void()) })
/** @typedef { z.infer<typeof RemoveLock> } RemoveLockSchema */

export const RemoveLockBound = z.function({ input: [z.string().describe('document ID to unlock'), LockOptions], output: z.promise(z.void()) })
/** @typedef { z.infer<typeof RemoveLockBound> } RemoveLockBoundSchema */
