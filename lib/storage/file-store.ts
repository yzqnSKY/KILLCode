import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { parseBackup } from '@/lib/local-db/backup'
import { defaultState } from '@/lib/local-db/defaults'
import type { ProblemMessage, ProblemState, PseudocodeVersion } from '@/lib/types'
import type { StorageOperation, StorageSnapshot } from './protocol'

type Table = 'problemStates' | 'messages' | 'settings' | 'pseudocodeVersions'

export class FileLearningStore {
  private sql: DatabaseSync
  constructor(private directory: string) {
    mkdirSync(directory, { recursive: true })
    this.sql = new DatabaseSync(path.join(directory, 'learning.sqlite'))
    this.sql.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA synchronous=FULL;')
    for (const table of ['problemStates', 'messages', 'settings', 'pseudocodeVersions']) {
      this.sql.exec(`CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, data TEXT NOT NULL)`)
    }
    this.sql.exec('CREATE TABLE IF NOT EXISTS migrations (id TEXT PRIMARY KEY); CREATE TABLE IF NOT EXISTS metadata (id TEXT PRIMARY KEY, value INTEGER NOT NULL); INSERT OR IGNORE INTO metadata VALUES (\'revision\', 0);')
  }

  close() { this.sql.close() }
  private all<T>(table: Table): T[] {
    return this.sql.prepare(`SELECT data FROM ${table} ORDER BY id`).all().map((row) => JSON.parse(row.data as string))
  }
  private get<T>(table: Table, id: string): T | undefined {
    const row = this.sql.prepare(`SELECT data FROM ${table} WHERE id = ?`).get(id)
    return row ? JSON.parse(row.data as string) : undefined
  }
  private put(table: Table, id: string, value: unknown) {
    this.sql.prepare(`INSERT INTO ${table} (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data`).run(id, JSON.stringify(value))
  }
  private markStarted(contentId: string) {
    const state = this.get<ProblemState>('problemStates', contentId) ?? defaultState(contentId)
    if (state.status === 'not_started') this.put('problemStates', contentId, { ...state, status: 'in_progress' })
  }
  snapshot(): StorageSnapshot {
    return {
      schemaVersion: 1, exportedAt: new Date().toISOString(),
      revision: Number(this.sql.prepare("SELECT value FROM metadata WHERE id = 'revision'").get()!.value),
      problemStates: this.all('problemStates'), messages: this.all('messages'), settings: this.all('settings'), pseudocodeVersions: this.all('pseudocodeVersions'),
    }
  }
  private backup(label: string) {
    const folder = path.join(this.directory, 'backups')
    mkdirSync(folder, { recursive: true })
    try { writeFileSync(path.join(folder, `${label}.json`), JSON.stringify(this.snapshot(), null, 2), { flag: 'wx' }) }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error }
  }
  apply(operation: StorageOperation): StorageSnapshot {
    this.sql.exec('BEGIN IMMEDIATE')
    try {
      this.backup(new Date().toISOString().slice(0, 10))
      const now = new Date().toISOString()
      switch (operation.type) {
        case 'patchState': {
          if (!operation.contentId || !operation.patch || typeof operation.patch !== 'object') throw new Error('题目记录无效')
          const current = this.get<ProblemState>('problemStates', operation.contentId) ?? defaultState(operation.contentId)
          const patch = { ...operation.patch }
          if (patch.draftUpdatedAt && current.draftUpdatedAt && patch.draftUpdatedAt < current.draftUpdatedAt) {
            delete patch.noteMarkdown; delete patch.pseudocode; delete patch.draftUpdatedAt
          }
          const next = { ...current, ...patch, contentId: operation.contentId, updatedAt: now }
          if (typeof next.noteMarkdown !== 'string' || typeof next.pseudocode !== 'string' || !['not_started', 'in_progress', 'completed'].includes(next.status)) throw new Error('题目记录格式无效')
          if (next.status === 'not_started' && (next.noteMarkdown.trim() || next.pseudocode.trim())) next.status = 'in_progress'
          this.put('problemStates', next.contentId, next)
          break
        }
        case 'putMessages':
          for (const message of operation.messages) { this.put('messages', message.id, message); this.markStarted(message.contentId) }
          break
        case 'patchMessage': {
          const current = this.get<ProblemMessage>('messages', operation.id)
          if (!current) throw new Error('对话记录不存在')
          this.put('messages', current.id, { ...current, ...operation.patch, id: current.id, contentId: current.contentId })
          break
        }
        case 'saveVersion': {
          if (!operation.contentId || !operation.name?.trim() || !operation.code?.trim()) throw new Error('请填写版本名称和伪代码')
          const version: PseudocodeVersion = { id: randomUUID(), contentId: operation.contentId, name: operation.name.trim().slice(0, 120), code: operation.code, createdAt: now, updatedAt: now }
          this.put('pseudocodeVersions', version.id, version)
          this.markStarted(version.contentId)
          break
        }
        case 'renameVersion': {
          const version = this.get<PseudocodeVersion>('pseudocodeVersions', operation.id)
          if (!version || !operation.name?.trim()) throw new Error('版本不存在或名称为空')
          this.put('pseudocodeVersions', version.id, { ...version, name: operation.name.trim().slice(0, 120), updatedAt: now })
          break
        }
        case 'deleteVersion': this.sql.prepare('DELETE FROM pseudocodeVersions WHERE id = ?').run(operation.id); break
        case 'merge': {
          if (operation.sourceId && this.sql.prepare('SELECT id FROM migrations WHERE id = ?').get(operation.sourceId)) break
          const payload = parseBackup(JSON.stringify(operation.payload)).payload
          const incomingMessages = new Set(payload.messages.map((message) => message.contentId))
          this.backup(`before-import-${now.replace(/[:.]/g, '-')}-${randomUUID().slice(0, 6)}`)
          writeFileSync(path.join(this.directory, 'backups', `import-${randomUUID()}.json`), JSON.stringify(payload, null, 2), { flag: 'wx' })
          for (const incoming of payload.problemStates) {
            const current = this.get<ProblemState>('problemStates', incoming.contentId)
            const winner = !current || incoming.updatedAt > current.updatedAt ? incoming : current
            const other = winner === incoming ? current : incoming
            if (other?.pseudocode?.trim() && other.pseudocode !== winner.pseudocode) {
              const id = `migration-${other.contentId}-${other.updatedAt}`
              if (!this.get('pseudocodeVersions', id)) this.put('pseudocodeVersions', id, { id, contentId: other.contentId, name: '迁移时保留的草稿', code: other.pseudocode, createdAt: other.updatedAt, updatedAt: other.updatedAt })
            }
            const state = { ...defaultState(incoming.contentId), ...winner }
            if (state.status === 'not_started' && (state.noteMarkdown.trim() || state.pseudocode.trim() || incomingMessages.has(state.contentId))) state.status = 'in_progress'
            this.put('problemStates', state.contentId, state)
          }
          for (const message of payload.messages) {
            // Repeated migration cannot replace a newer or completed conversation.
            if (!this.get('messages', message.id)) this.put('messages', message.id, message)
            this.markStarted(message.contentId)
          }
          for (const version of payload.pseudocodeVersions ?? []) {
            const previous = this.get<PseudocodeVersion>('pseudocodeVersions', version.id)
            if (!previous || version.updatedAt > previous.updatedAt) this.put('pseudocodeVersions', version.id, version)
            this.markStarted(version.contentId)
          }
          for (const setting of payload.settings) if (!this.get('settings', setting.id)) this.put('settings', setting.id, setting)
          if (operation.sourceId) this.sql.prepare('INSERT INTO migrations VALUES (?)').run(operation.sourceId)
          break
        }
        case 'clear':
          this.backup(`before-clear-${now.replace(/[:.]/g, '-')}`)
          for (const table of ['problemStates', 'messages', 'settings', 'pseudocodeVersions']) this.sql.exec(`DELETE FROM ${table}`)
          break
        default: throw new Error('不支持的存储操作')
      }
      this.sql.exec("UPDATE metadata SET value = value + 1 WHERE id = 'revision'; COMMIT")
      return this.snapshot()
    } catch (error) { this.sql.exec('ROLLBACK'); throw error }
  }
}

const stores = globalThis as typeof globalThis & { killcodeFileStore?: FileLearningStore }
export function getFileStore() {
  return stores.killcodeFileStore ??= new FileLearningStore(process.env.KILLCODE_DATA_DIR || path.join(process.cwd(), '.killcode-data'))
}
