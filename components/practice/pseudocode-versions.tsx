'use client'

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deletePseudocodeVersion, renamePseudocodeVersion, savePseudocodeVersion, saveJournaledDraft } from '@/lib/local-db/db'

export function PseudocodeVersions({ contentId, code, onLoad }: { contentId: string; code: string; onLoad: (code: string) => void }) {
  const versions = useLiveQuery(() => db.pseudocodeVersions.where('contentId').equals(contentId).sortBy('createdAt'), [contentId]) ?? []
  const [name, setName] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const selected = versions.find((version) => version.id === selectedId)

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true); setFeedback('')
    try { await action(); setFeedback(success) }
    catch (error) { setFeedback(error instanceof Error ? error.message : '版本操作失败') }
    finally { setBusy(false) }
  }

  return <section className="pseudocode-versions" aria-label="伪代码版本管理">
    <div className="version-save-row">
      <input aria-label="解法版本名称" placeholder="版本名称，例如：递归 / 记忆化 / 迭代" value={name} maxLength={120} onChange={(event) => setName(event.target.value)}/>
      <button className="button" disabled={busy || !name.trim() || !code.trim()} onClick={() => void run(async () => {
        await saveJournaledDraft(contentId)
        await savePseudocodeVersion(contentId, name, code)
      }, `已保存版本：${name.trim()}`)}>保存为新版本</button>
    </div>
    <p>当前草稿自动保存；已保存的解法版本不会随草稿修改。</p>
    <select aria-label="已保存的伪代码版本" value={selectedId} disabled={busy} onChange={(event) => {
      setSelectedId(event.target.value)
      const version = versions.find((version) => version.id === event.target.value)
      if (version) setName(version.name)
      setFeedback('')
    }}><option value="">查看已保存的版本（{versions.length}）</option>{[...versions].reverse().map((version) => <option key={version.id} value={version.id}>{version.name} · {new Date(version.createdAt).toLocaleString('zh-CN')}</option>)}</select>
    {selected && <div className="version-preview">
      <pre>{selected.code}</pre>
      <div className="button-row">
        <button className="button" disabled={busy} onClick={() => void run(async () => {
          await saveJournaledDraft(contentId)
          if (code.trim() && code !== selected.code && !versions.some((version) => version.code === code)) {
            await savePseudocodeVersion(contentId, '载入版本前的草稿', code)
          }
          onLoad(selected.code)
        }, `已载入 ${selected.name}，可以继续修改草稿`)}>载入编辑器</button>
        <button className="button subtle" disabled={busy || !name.trim()} onClick={() => void run(() => renamePseudocodeVersion(selected.id, name), '版本已重命名')}>重命名</button>
        <button className="button subtle" disabled={busy} onClick={() => {
          if (confirm(`删除版本“${selected.name}”？当前草稿不受影响。`)) void run(async () => { await deletePseudocodeVersion(selected.id); setSelectedId('') }, '版本已删除')
        }}>删除版本</button>
      </div>
    </div>}
    <small role="status">{busy ? '正在保存到本机…' : feedback}</small>
  </section>
}
