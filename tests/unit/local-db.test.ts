import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, patchProblemState } from '@/lib/local-db/db'

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
})
