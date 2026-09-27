import { describe, expect, it } from 'vitest'
import { mergeProblemStates, parseBackup } from '@/lib/local-db/backup'
import type { ProblemState } from '@/lib/types'

function state(contentId: string, updatedAt: string): ProblemState {
  return { contentId, status: 'in_progress', isBookmarked: false, noteMarkdown: '', pseudocode: '', lastOpenedAt: updatedAt, updatedAt }
}

describe('local backup', () => {
  it('previews records and skips unknown content IDs', () => {
    const text = JSON.stringify({ schemaVersion: 1, exportedAt: '2026-01-01', problemStates: [state('known', '2026-01-01'), state('gone', '2026-01-01')], messages: [{ id: 'm', contentId: 'gone', role: 'user', kind: 'question', content: 'x', status: 'completed', createdAt: '2026-01-01' }], settings: [] })
    const preview = parseBackup(text, new Set(['known']))
    expect(preview.counts.problemStates).toBe(1)
    expect(preview.counts.messages).toBe(0)
    expect(preview.unknownContentIds).toEqual(['gone'])
  })

  it('accepts legacy version and rejects malformed records', () => {
    expect(parseBackup(JSON.stringify({ version: 1, problemStates: [], messages: [] })).payload.schemaVersion).toBe(1)
    expect(() => parseBackup(JSON.stringify({ schemaVersion: 2, problemStates: [], messages: [] }))).toThrow()
  })

  it('merges problem states by updatedAt', () => {
    const merged = mergeProblemStates([state('a', '2026-02-01')], [state('a', '2026-01-01'), state('b', '2026-03-01')])
    expect(merged.find((entry) => entry.contentId === 'a')?.updatedAt).toBe('2026-02-01')
    expect(merged.map((entry) => entry.contentId).sort()).toEqual(['a', 'b'])
  })
})
