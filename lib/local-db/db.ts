'use client'

import Dexie, { type EntityTable } from 'dexie'
import type { LocalSettings, ProblemMessage, ProblemState } from '@/lib/types'
import { BACKUP_SCHEMA_VERSION, mergeProblemStates, parseBackup } from './backup'

class KILLCodeDB extends Dexie {
  problemStates!: EntityTable<ProblemState, 'contentId'>
  messages!: EntityTable<ProblemMessage, 'id'>
  settings!: EntityTable<LocalSettings, 'id'>

  constructor() {
    super('killcode')
    this.version(1).stores({
      problemStates: '&contentId, status, lastOpenedAt, updatedAt',
      messages: '&id, [contentId+createdAt], contentId, status',
      settings: '&id',
    })
  }
}

export const db = new KILLCodeDB()

export function defaultState(contentId: string): ProblemState {
  const now = new Date().toISOString()
  return { contentId, status: 'not_started', isBookmarked: false, readingMaskEnabled: false, revealedMaskGroups: [0], noteMarkdown: '', pseudocode: '', lastOpenedAt: now, updatedAt: now }
}

export async function patchProblemState(contentId: string, patch: Partial<ProblemState>) {
  const current = await db.problemStates.get(contentId) ?? defaultState(contentId)
  await db.problemStates.put({ ...current, ...patch, contentId, updatedAt: new Date().toISOString() })
}

export async function exportLocalData() {
  const payload = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    problemStates: await db.problemStates.toArray(),
    messages: await db.messages.toArray(),
    settings: await db.settings.toArray(),
  }
  return JSON.stringify(payload, null, 2)
}

export async function importLocalData(text: string, validContentIds?: ReadonlySet<string>) {
  const preview = parseBackup(text, validContentIds)
  const currentStates = await db.problemStates.toArray()
  const problemStates = mergeProblemStates(currentStates, preview.payload.problemStates)
  await db.transaction('rw', [db.problemStates, db.messages, db.settings], async () => {
    await db.problemStates.bulkPut(problemStates)
    await db.messages.bulkPut(preview.payload.messages)
    if (preview.payload.settings.length) await db.settings.bulkPut(preview.payload.settings)
  })
  return preview
}
