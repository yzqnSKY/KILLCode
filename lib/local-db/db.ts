'use client'

import Dexie, { type EntityTable } from 'dexie'
import type { LocalSettings, ProblemMessage, ProblemState, PseudocodeVersion } from '@/lib/types'
import { BACKUP_SCHEMA_VERSION, mergeProblemStates, parseBackup } from './backup'
import { defaultState } from './defaults'
import type { StorageOperation, StorageSnapshot } from '@/lib/storage/protocol'

export { defaultState } from './defaults'

export class KILLCodeDB extends Dexie {
  problemStates!: EntityTable<ProblemState, 'contentId'>
  messages!: EntityTable<ProblemMessage, 'id'>
  settings!: EntityTable<LocalSettings, 'id'>
  pseudocodeVersions!: EntityTable<PseudocodeVersion, 'id'>

  constructor(name = 'killcode') {
    super(name)
    this.version(1).stores({
      problemStates: '&contentId, status, lastOpenedAt, updatedAt',
      messages: '&id, [contentId+createdAt], contentId, status',
      settings: '&id',
    })
    this.version(2).stores({
      problemStates: '&contentId, status, lastOpenedAt, updatedAt',
      messages: '&id, [contentId+createdAt], contentId, status',
      settings: '&id',
    }).upgrade(async (transaction) => {
      const states = transaction.table<ProblemState, string>('problemStates')
      const messages = await transaction.table<ProblemMessage, string>('messages').toArray()
      const messageIds = new Set(messages.map((message) => message.contentId))
      const existing = await states.toArray()
      for (const state of existing) {
        if (state.status === 'not_started' && (hasWrittenWork(state) || messageIds.has(state.contentId))) {
          await states.put({ ...state, status: 'in_progress' })
        }
        messageIds.delete(state.contentId)
      }
      for (const contentId of messageIds) {
        const createdAt = messages.filter((message) => message.contentId === contentId).map((message) => message.createdAt).sort()[0]
        await states.put({ ...defaultState(contentId), status: 'in_progress', lastOpenedAt: createdAt, updatedAt: createdAt })
      }
    })
    this.version(3).stores({ pseudocodeVersions: '&id, contentId, createdAt' })
  }
}

export const db = new KILLCodeDB()

let initialization: Promise<void> | undefined
let workQueue: Promise<unknown> = Promise.resolve()
let revision = -1

async function requestSnapshot(operation?: StorageOperation, keepalive = false): Promise<StorageSnapshot> {
  let response: Response
  try {
    response = await fetch('/api/storage', operation ? {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(operation), keepalive,
    } : { cache: 'no-store' })
  } catch { throw new Error('无法连接本机存储，请确认 KILLCode 仍在运行') }
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || '本机数据保存失败')
  return result
}

async function cacheSnapshot(snapshot: StorageSnapshot) {
  if (snapshot.revision === revision) return
  await db.transaction('rw', [db.problemStates, db.messages, db.settings, db.pseudocodeVersions], async () => {
    await Promise.all([db.problemStates.clear(), db.messages.clear(), db.settings.clear(), db.pseudocodeVersions.clear()])
    await db.problemStates.bulkPut(snapshot.problemStates)
    await db.messages.bulkPut(snapshot.messages)
    await db.settings.bulkPut(snapshot.settings)
    await db.pseudocodeVersions.bulkPut(snapshot.pseudocodeVersions ?? [])
  })
  revision = snapshot.revision
}

export function initializeStorage(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  return initialization ??= (async () => {
    let sourceId = localStorage.getItem('killcode-migration-source')
    if (!sourceId) { sourceId = crypto.randomUUID(); localStorage.setItem('killcode-migration-source', sourceId) }
    if (!localStorage.getItem('killcode-file-storage-migrated')) {
      const payload = { schemaVersion: BACKUP_SCHEMA_VERSION, exportedAt: new Date().toISOString(), problemStates: await db.problemStates.toArray(), messages: await db.messages.toArray(), settings: await db.settings.toArray(), pseudocodeVersions: await db.pseudocodeVersions.toArray() }
      await cacheSnapshot(await requestSnapshot({ type: 'merge', payload, sourceId }))
      localStorage.setItem('killcode-file-storage-migrated', '1')
    } else await cacheSnapshot(await requestSnapshot())
    // A browser journal is a recovery copy, never the authoritative database.
    for (const key of Object.keys(localStorage).filter((key) => key.startsWith('killcode-draft-'))) {
      const text = localStorage.getItem(key)
      if (!text) continue
      const draft = JSON.parse(text) as { contentId: string; patch: Partial<ProblemState> }
      await cacheSnapshot(await requestSnapshot({ type: 'patchState', ...draft }))
      if (localStorage.getItem(key) === text) localStorage.removeItem(key)
    }
  })().catch((error) => { initialization = undefined; throw error })
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = workQueue.catch(() => {}).then(task)
  workQueue = next
  return next
}

async function mutate(operation: StorageOperation) {
  await initializeStorage()
  return enqueue(async () => {
    const snapshot = await requestSnapshot(operation)
    await cacheSnapshot(snapshot)
    return snapshot
  })
}

export async function refreshStorage() {
  await initializeStorage()
  await enqueue(async () => {
    for (const key of Object.keys(localStorage).filter((key) => key.startsWith('killcode-draft-'))) {
      const text = localStorage.getItem(key)
      if (!text) continue
      const draft = JSON.parse(text) as { contentId: string; patch: Partial<ProblemState> }
      await cacheSnapshot(await requestSnapshot({ type: 'patchState', ...draft }))
      if (localStorage.getItem(key) === text) localStorage.removeItem(key)
    }
    await cacheSnapshot(await requestSnapshot())
    window.dispatchEvent(new Event('killcode-storage-synced'))
  })
}

export async function patchProblemState(contentId: string, patch: Partial<ProblemState>) {
  if (typeof window !== 'undefined') {
    const snapshot = await mutate({ type: 'patchState', contentId, patch })
    return snapshot.problemStates.find((state) => state.contentId === contentId)!
  }
  return db.transaction('rw', db.problemStates, async () => {
    const current = await db.problemStates.get(contentId) ?? defaultState(contentId)
    const next = { ...current, ...patch, contentId, updatedAt: new Date().toISOString() }
    if (next.status === 'not_started' && hasWrittenWork(next)) next.status = 'in_progress'
    await db.problemStates.put(next)
    return next
  })
}

function hasWrittenWork(state: ProblemState) {
  return Boolean(state.noteMarkdown?.trim() || state.pseudocode?.trim())
}

export async function exportLocalData() {
  if (typeof window !== 'undefined') { await refreshStorage() }
  const payload = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    problemStates: await db.problemStates.toArray(),
    messages: await db.messages.toArray(),
    settings: await db.settings.toArray(),
    pseudocodeVersions: await db.pseudocodeVersions.toArray(),
  }
  return JSON.stringify(payload, null, 2)
}

export async function importLocalData(text: string, validContentIds?: ReadonlySet<string>) {
  const preview = parseBackup(text, validContentIds)
  if (typeof window !== 'undefined') {
    await mutate({ type: 'merge', payload: preview.payload })
    return preview
  }
  const currentStates = await db.problemStates.toArray()
  const messageIds = new Set([
    ...(await db.messages.toArray()), ...preview.payload.messages,
  ].map((message) => message.contentId))
  const problemStates = mergeProblemStates(currentStates, preview.payload.problemStates).map((state) =>
    state.status === 'not_started' && (hasWrittenWork(state) || messageIds.has(state.contentId))
      ? { ...state, status: 'in_progress' as const } : state,
  )
  await db.transaction('rw', [db.problemStates, db.messages, db.settings, db.pseudocodeVersions], async () => {
    await db.problemStates.bulkPut(problemStates)
    await db.messages.bulkPut(preview.payload.messages)
    if (preview.payload.settings.length) await db.settings.bulkPut(preview.payload.settings)
    await db.pseudocodeVersions.bulkPut(preview.payload.pseudocodeVersions ?? [])
  })
  return preview
}

export async function putMessages(messages: ProblemMessage[]) { await mutate({ type: 'putMessages', messages }) }
export async function patchMessage(id: string, patch: Partial<ProblemMessage>) { await mutate({ type: 'patchMessage', id, patch }) }
export async function savePseudocodeVersion(contentId: string, name: string, code: string) { await mutate({ type: 'saveVersion', contentId, name, code }) }
export async function renamePseudocodeVersion(id: string, name: string) { await mutate({ type: 'renameVersion', id, name }) }
export async function deletePseudocodeVersion(id: string) { await mutate({ type: 'deleteVersion', id }) }
export async function clearLearningData() {
  await mutate({ type: 'clear' })
  for (const key of Object.keys(localStorage).filter((key) => key.startsWith('killcode-draft-'))) localStorage.removeItem(key)
}

export function journalDraft(contentId: string, noteMarkdown: string, pseudocode: string) {
  const draft = { contentId, patch: { noteMarkdown, pseudocode, draftUpdatedAt: new Date().toISOString() } }
  localStorage.setItem(`killcode-draft-${contentId}`, JSON.stringify(draft))
  return draft
}

export async function saveJournaledDraft(contentId: string, keepalive = false) {
  const key = `killcode-draft-${contentId}`
  const text = localStorage.getItem(key)
  if (!text) return
  const draft = JSON.parse(text) as { contentId: string; patch: Partial<ProblemState> }
  if (keepalive) await requestSnapshot({ type: 'patchState', ...draft }, true)
  else await patchProblemState(draft.contentId, draft.patch)
  if (localStorage.getItem(key) === text) localStorage.removeItem(key)
}
