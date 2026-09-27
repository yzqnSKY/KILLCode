import type { LocalSettings, ProblemMessage, ProblemState } from '@/lib/types'

export const BACKUP_SCHEMA_VERSION = 1

export interface BackupPayload {
  schemaVersion: number
  exportedAt: string
  problemStates: ProblemState[]
  messages: ProblemMessage[]
  settings: LocalSettings[]
}

export interface ImportPreview {
  payload: BackupPayload
  counts: { problemStates: number; messages: number; settings: number }
  unknownContentIds: string[]
}

export function parseBackup(text: string, validContentIds?: ReadonlySet<string>): ImportPreview {
  const raw = JSON.parse(text) as Partial<BackupPayload> & { version?: number }
  const schemaVersion = raw.schemaVersion ?? raw.version
  if (schemaVersion !== BACKUP_SCHEMA_VERSION || !Array.isArray(raw.problemStates) || !Array.isArray(raw.messages) || (raw.settings !== undefined && !Array.isArray(raw.settings))) {
    throw new Error('备份文件格式或版本不受支持')
  }
  const problemStates = raw.problemStates.filter((state) => typeof state?.contentId === 'string' && typeof state.updatedAt === 'string')
  const messages = raw.messages.filter((message) => typeof message?.id === 'string' && typeof message.contentId === 'string' && typeof message.createdAt === 'string')
  if (problemStates.length !== raw.problemStates.length || messages.length !== raw.messages.length) throw new Error('备份中包含损坏的学习记录')
  const allIds = new Set([...problemStates.map((state) => state.contentId), ...messages.map((message) => message.contentId)])
  const unknownContentIds = validContentIds ? [...allIds].filter((id) => !validContentIds.has(id)).sort() : []
  const allowed = (id: string) => !validContentIds || validContentIds.has(id)
  const payload: BackupPayload = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : new Date().toISOString(),
    problemStates: problemStates.filter((state) => allowed(state.contentId)),
    messages: messages.filter((message) => allowed(message.contentId)),
    settings: raw.settings ?? [],
  }
  return { payload, counts: { problemStates: payload.problemStates.length, messages: payload.messages.length, settings: payload.settings.length }, unknownContentIds }
}

export function mergeProblemStates(current: ProblemState[], incoming: ProblemState[]) {
  const merged = new Map(current.map((state) => [state.contentId, state]))
  for (const state of incoming) {
    const previous = merged.get(state.contentId)
    if (!previous || state.updatedAt >= previous.updatedAt) merged.set(state.contentId, state)
  }
  return [...merged.values()]
}
