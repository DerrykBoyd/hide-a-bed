import { z } from 'zod'
import { CouchConfig } from '../config.mts'
import { CouchDoc } from '../couch.schema.mts'

export const Lock = CouchDoc.extend({
  type: z.literal('lock'),
  locks: z.string().describe('the document ID being locked'),
  lockedAt: z.string().describe('ISO timestamp when lock was created'),
  lockedBy: z.string().describe('username of who created the lock')
})
export
  type LockSchema = z.infer<typeof Lock>

export const LockOptions = z.object({
  enableLocking: z.boolean().prefault(true).describe('whether locking is enabled'),
  username: z.string().describe('username to attribute locks to')
})
export
  type LockOptionsSchema = z.infer<typeof LockOptions>

export const CreateLock = z.function({ input: [CouchConfig, z.string().describe('document ID to lock'), LockOptions], output: z.promise(z.boolean()) })
export
  type CreateLockSchema = z.infer<typeof CreateLock>
export const CreateLockBound = z.function({ input: [z.string().describe('document ID to lock'), LockOptions], output: z.promise(z.boolean()) })
export
  type CreateLockBoundSchema = z.infer<typeof CreateLockBound>

export const RemoveLock = z.function({ input: [CouchConfig, z.string().describe('document ID to unlock'), LockOptions], output: z.promise(z.void()) })
export
  type RemoveLockSchema = z.infer<typeof RemoveLock>

export const RemoveLockBound = z.function({ input: [z.string().describe('document ID to unlock'), LockOptions], output: z.promise(z.void()) })
export
  type RemoveLockBoundSchema = z.infer<typeof RemoveLockBound>
