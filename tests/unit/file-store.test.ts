import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { FileLearningStore } from '@/lib/storage/file-store'
import { defaultState } from '@/lib/local-db/defaults'

describe('shared local file learning store', () => {
  let directory: string
  let store: FileLearningStore
  beforeEach(() => { directory = mkdtempSync(path.join(tmpdir(), 'killcode-store-test-')); store = new FileLearningStore(directory) })
  afterEach(() => {
    store.close()
    if (path.dirname(directory) !== path.resolve(tmpdir()) || !path.basename(directory).startsWith('killcode-store-test-')) throw new Error('Invalid test directory')
    rmSync(directory, { recursive: true, force: true })
  })
  it('persists data after reopening and shares data between server connections', () => {
    store.apply({ type: 'patchState', contentId: 'p1', patch: { noteMarkdown: '笔记', pseudocode: 'return 1' } })
    const second = new FileLearningStore(directory)
    try {
      expect(second.snapshot().problemStates[0]).toMatchObject({ noteMarkdown: '笔记', pseudocode: 'return 1', status: 'in_progress' })
      second.apply({ type: 'patchState', contentId: 'p1', patch: { isBookmarked: true } })
      expect(store.snapshot().problemStates[0].isBookmarked).toBe(true)
    } finally { second.close() }
    store.close(); store = new FileLearningStore(directory)
    expect(store.snapshot().problemStates[0].pseudocode).toBe('return 1')
  })
  it('keeps named solutions independent from the autosaved draft', () => {
    store.apply({ type: 'saveVersion', contentId: 'p1', name: '递归', code: 'recursive()' })
    store.apply({ type: 'saveVersion', contentId: 'p1', name: '迭代', code: 'for i in range(n)' })
    store.apply({ type: 'patchState', contentId: 'p1', patch: { pseudocode: 'new draft' } })
    const snapshot = store.snapshot()
    expect(snapshot.pseudocodeVersions?.map((version) => version.code).sort()).toEqual(['for i in range(n)', 'recursive()'])
    const recursive = snapshot.pseudocodeVersions!.find((version) => version.name === '递归')!
    store.apply({ type: 'renameVersion', id: recursive.id, name: '记忆化递归' })
    expect(store.snapshot().pseudocodeVersions?.find((version) => version.id === recursive.id)?.code).toBe('recursive()')
    store.apply({ type: 'deleteVersion', id: recursive.id })
    expect(store.snapshot().pseudocodeVersions).toHaveLength(1)
    expect(store.snapshot().problemStates[0].pseudocode).toBe('new draft')
  })
  it('ignores an older pending draft while preserving other fields and completion', () => {
    store.apply({ type: 'patchState', contentId: 'p1', patch: { status: 'completed', pseudocode: 'latest', draftUpdatedAt: '2026-09-27T01:00:00Z' } })
    store.apply({ type: 'patchState', contentId: 'p1', patch: { pseudocode: 'stale', draftUpdatedAt: '2026-09-26T01:00:00Z', isBookmarked: true } })
    expect(store.snapshot().problemStates[0]).toMatchObject({ status: 'completed', pseudocode: 'latest', isBookmarked: true })
  })
  it('migrates once, preserves conversations and conflicting drafts, and includes versions in backup', () => {
    store.apply({ type: 'patchState', contentId: 'p1', patch: { pseudocode: 'current' } })
    const payload = { schemaVersion: 1, exportedAt: '', problemStates: [{ ...defaultState('p1'), pseudocode: 'older draft', updatedAt: '2020-01-01' }], messages: [
      { id: 'm1', contentId: 'p1', role: 'user' as const, kind: 'question' as const, content: '问题', status: 'completed' as const, createdAt: '2020-01-01' },
    ], settings: [] }
    store.apply({ type: 'merge', payload, sourceId: 'legacy-browser' })
    store.apply({ type: 'merge', payload, sourceId: 'legacy-browser' })
    expect(store.snapshot().messages).toHaveLength(1)
    expect(store.snapshot().problemStates[0].pseudocode).toBe('current')
    expect(store.snapshot().pseudocodeVersions).toHaveLength(1)
    expect(store.snapshot().pseudocodeVersions![0].code).toBe('older draft')
    const exported = JSON.parse(JSON.stringify(store.snapshot()))
    store.apply({ type: 'clear' })
    // Reopening an old migrated browser must not resurrect cleared data.
    store.apply({ type: 'merge', payload, sourceId: 'legacy-browser' })
    expect(store.snapshot().messages).toHaveLength(0)
    store.apply({ type: 'merge', payload: exported })
    expect(store.snapshot().messages).toHaveLength(1)
    expect(store.snapshot().pseudocodeVersions).toHaveLength(1)
  })
  it('creates recoverable backups before destructive operations and rolls back failed writes', () => {
    store.apply({ type: 'patchState', contentId: 'p1', patch: { noteMarkdown: '保留数据' } })
    expect(() => store.apply({ type: 'saveVersion', contentId: 'p1', name: '', code: '' })).toThrow()
    expect(store.snapshot().problemStates[0].noteMarkdown).toBe('保留数据')
    store.apply({ type: 'clear' })
    const backupName = readdirSync(path.join(directory, 'backups')).find((name) => name.startsWith('before-clear-'))!
    const backup = JSON.parse(readFileSync(path.join(directory, 'backups', backupName), 'utf8'))
    expect(backup.problemStates[0].noteMarkdown).toBe('保留数据')
    expect(store.snapshot().problemStates).toHaveLength(0)
  })
})
