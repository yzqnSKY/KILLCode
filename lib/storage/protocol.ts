import type { BackupPayload } from '@/lib/local-db/backup'
import type { ProblemMessage, ProblemState } from '@/lib/types'

export type StorageOperation =
  | { type: 'patchState'; contentId: string; patch: Partial<ProblemState> }
  | { type: 'putMessages'; messages: ProblemMessage[] }
  | { type: 'patchMessage'; id: string; patch: Partial<ProblemMessage> }
  | { type: 'saveVersion'; contentId: string; name: string; code: string }
  | { type: 'renameVersion'; id: string; name: string }
  | { type: 'deleteVersion'; id: string }
  | { type: 'merge'; payload: BackupPayload; sourceId?: string }
  | { type: 'clear' }

export interface StorageSnapshot extends BackupPayload {
  revision: number
}
