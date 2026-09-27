import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { db, defaultState, importLocalData, KILLCodeDB, patchProblemState } from '@/lib/local-db/db'

describe('IndexedDB learning data', () => {
  beforeEach(async () => {
    await db.problemStates.clear()
    await db.messages.clear()
  })

  it('persists bookmark and learning state independently', async () => {
    await patchProblemState('p1', { isBookmarked: true, status: 'completed' })
    await patchProblemState('p2', { status: 'in_progress' })
    expect(await db.problemStates.get('p1')).toMatchObject({ isBookmarked: true, status: 'completed' })
    expect(await db.problemStates.get('p2')).toMatchObject({ isBookmarked: false, status: 'in_progress' })
  })

  it('isolates AI messages by contentId', async () => {
    await db.messages.bulkPut([
      { id: 'm1', contentId: 'p1', role: 'user', kind: 'question', content: 'A', status: 'completed', createdAt: '2026-01-01' },
      { id: 'm2', contentId: 'p2', role: 'user', kind: 'question', content: 'B', status: 'completed', createdAt: '2026-01-02' },
    ])
    const rows = await db.messages.where('[contentId+createdAt]').between(['p1', ''], ['p1', '\uffff']).toArray()
    expect(rows.map((row) => row.content)).toEqual(['A'])
  })

  it('starts learning when notes or pseudocode are saved, but not for a bookmark alone', async () => {
    await patchProblemState('bookmark', { isBookmarked: true })
    await patchProblemState('notes', { noteMarkdown: '边界条件' })
    await patchProblemState('code', { pseudocode: 'return 1' })
    await patchProblemState('blank', { noteMarkdown: '  ' })
    expect((await db.problemStates.get('bookmark'))?.status).toBe('not_started')
    expect((await db.problemStates.get('blank'))?.status).toBe('not_started')
    expect((await db.problemStates.get('notes'))?.status).toBe('in_progress')
    expect((await db.problemStates.get('code'))?.status).toBe('in_progress')
  })

  it('keeps completed status when editing and preserves independent concurrent updates', async () => {
    await patchProblemState('p1', { status: 'completed', noteMarkdown: '旧笔记' })
    await Promise.all([
      patchProblemState('p1', { isBookmarked: true }),
      patchProblemState('p1', { pseudocode: 'return 1' }),
    ])
    expect(await db.problemStates.get('p1')).toMatchObject({ status: 'completed', isBookmarked: true, noteMarkdown: '旧笔记', pseudocode: 'return 1' })
  })

  it('repairs imported not-started records containing work or messages', async () => {
    const states = ['notes', 'chat', 'bookmark'].map(defaultState)
    states[0].noteMarkdown = '保留笔记'
    states[2].isBookmarked = true
    await importLocalData(JSON.stringify({ schemaVersion: 1, problemStates: states, messages: [
      { id: 'chat-1', contentId: 'chat', role: 'user', kind: 'question', content: '边界是什么？', status: 'completed', createdAt: '2026-01-01' },
    ] }))
    expect(await db.problemStates.get('notes')).toMatchObject({ status: 'in_progress', noteMarkdown: '保留笔记' })
    expect((await db.problemStates.get('chat'))?.status).toBe('in_progress')
    expect((await db.problemStates.get('bookmark'))?.status).toBe('not_started')
  })

  it('upgrades legacy records without losing notes, messages, timestamps, or completion', async () => {
    const name = `killcode-legacy-${crypto.randomUUID()}`
    const legacy = new Dexie(name)
    legacy.version(1).stores({ problemStates: '&contentId, status, lastOpenedAt, updatedAt', messages: '&id, [contentId+createdAt], contentId, status', settings: '&id' })
    const note = { ...defaultState('notes'), noteMarkdown: '旧笔记', updatedAt: '2026-01-01' }
    await legacy.table('problemStates').bulkPut([
      note, { ...defaultState('code'), pseudocode: 'return 1' }, defaultState('chat'),
      { ...defaultState('done'), status: 'completed', noteMarkdown: '已完成笔记' },
      { ...defaultState('bookmark'), isBookmarked: true },
    ])
    const messages = ['chat', 'orphan'].map((contentId) => ({ id: contentId, contentId, role: 'user', kind: 'question', content: '问题', status: 'completed', createdAt: '2026-01-02' }))
    await legacy.table('messages').bulkPut(messages)
    legacy.close()
    const upgraded = new KILLCodeDB(name)
    try {
      await upgraded.open()
      expect(await upgraded.problemStates.get('notes')).toEqual({ ...note, status: 'in_progress' })
      for (const id of ['code', 'chat', 'orphan']) expect((await upgraded.problemStates.get(id))?.status).toBe('in_progress')
      expect((await upgraded.problemStates.get('done'))?.status).toBe('completed')
      expect((await upgraded.problemStates.get('bookmark'))?.status).toBe('not_started')
      expect(await upgraded.messages.toArray()).toEqual(messages)
    } finally {
      await upgraded.delete()
    }
  })
})
