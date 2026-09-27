'use client'

import dynamic from 'next/dynamic'
import Dexie from 'dexie'
import Link from 'next/link'
import { Bookmark, Bot, Check, ChevronLeft, Code2, ExternalLink, EyeOff, FileText, Image, LoaderCircle, MessageSquare, NotebookPen, Paperclip, RefreshCw, Send, Sparkles, X } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { MarkdownView } from '@/components/markdown/markdown-view'
import { ReadingMask } from '@/components/markdown/reading-mask'
import { EvaluationView } from '@/components/ai/evaluation-view'
import { db, defaultState, patchProblemState, journalDraft, saveJournaledDraft, putMessages, patchMessage } from '@/lib/local-db/db'
import { PseudocodeVersions } from './pseudocode-versions'
import type { ContentItem, EvaluationResult, MessageAttachment, ProblemMessage, ProblemState } from '@/lib/types'

const CodeEditor = dynamic(() => import('./code-editor').then((mod) => mod.CodeEditor), { ssr: false, loading: () => <div className="editor-loading">正在加载编辑器…</div> })
type CodexReasoningOption = { reasoningEffort: string; description: string }
type CodexModelOption = { id: string; model: string; displayName: string; description?: string; hidden?: boolean; isDefault: boolean; defaultReasoningEffort?: string; supportedReasoningEfforts?: CodexReasoningOption[] }
type PendingAttachment = MessageAttachment & { id: string; data?: string; content?: string }
const textFileExtensions = new Set(['txt', 'md', 'markdown', 'json', 'csv', 'ts', 'tsx', 'js', 'jsx', 'py', 'java', 'c', 'cc', 'cpp', 'h', 'hpp', 'go', 'rs', 'html', 'css', 'sql', 'xml', 'yaml', 'yml', 'toml', 'log', 'sh', 'ps1'])
const supportedImageTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const reasoningEffortLabels: Record<string, string> = { none: '无', minimal: '极低', low: '低', medium: '中', high: '高', xhigh: '极高', max: '最大', ultra: '超高' }
const fileExtension = (name: string) => name.split('.').pop()?.toLowerCase() ?? ''
const readDataUrl = (file: File) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file) })
let modelOptionsRequest: Promise<CodexModelOption[]> | undefined
const loadModelOptions = () => modelOptionsRequest ??= fetch('/api/codex/models', { cache: 'no-store' }).then(async (response) => response.ok ? ((await response.json()).models ?? []) : [])

export function ProblemWorkspace({ item, markdown, linkMap, previous, next, collectionId, collectionLabel, collectionSize }: { item: ContentItem; markdown: string; linkMap: Record<string, string>; previous?: ContentItem; next?: ContentItem; collectionId?: string; collectionLabel?: string; collectionSize?: number }) {
  const problemHref = (target: ContentItem) => `/problems/${target.slug}${collectionId ? `?collection=${collectionId}` : ''}`
  const stored = useLiveQuery(() => db.problemStates.get(item.contentId).then((value) => value ?? null), [item.contentId])
  const messages = useLiveQuery(() => db.messages.where('[contentId+createdAt]').between([item.contentId, Dexie.minKey], [item.contentId, Dexie.maxKey]).reverse().limit(50).toArray().then((rows) => rows.reverse()), [item.contentId]) ?? []
  const [state, setState] = useState<ProblemState>(() => defaultState(item.contentId))
  const [toolPanel, setToolPanel] = useState<'practice' | 'notes' | 'ai'>('practice')
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])
  const [attachmentError, setAttachmentError] = useState('')
  const [busy, setBusy] = useState(false)
  const [codexConnected, setCodexConnected] = useState<boolean | null>(null)
  const [aiModels, setAiModels] = useState<CodexModelOption[]>([])
  const [selectedModel, setSelectedModel] = useState('')
  const [selectedEffort, setSelectedEffort] = useState('')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [noteMode, setNoteMode] = useState<'edit' | 'preview'>('edit')
  const [addedAnswerId, setAddedAnswerId] = useState<string>()
  const [aiDisclosureAccepted, setAiDisclosureAccepted] = useState(false)
  const [panelWidth, setPanelWidth] = useState(430)
  const [editorHeight, setEditorHeight] = useState(900)
  const [evaluationStatus, setEvaluationStatus] = useState<'idle' | 'pending' | 'done' | 'failed'>('idle')
  const [evaluationError, setEvaluationError] = useState('')
  const evaluationMessages = messages.filter((message) => message.kind === 'evaluation_result' && message.evaluation)
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string>()
  const selectedEvaluationMessage = evaluationMessages.find((message) => message.id === selectedEvaluationId) ?? evaluationMessages.at(-1)
  const latestEvaluation = selectedEvaluationMessage?.evaluation
  const stateLoaded = useRef(false)
  const [draftReady, setDraftReady] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const followLatestMessage = useRef(true)

  useEffect(() => {
    if (stored === undefined || stateLoaded.current) return
    stateLoaded.current = true
    void patchProblemState(item.contentId, {
      status: stored?.status === 'completed' ? 'completed' : 'in_progress',
      lastOpenedAt: new Date().toISOString(),
    }).then((opened) => { setState(opened); setDraftReady(true) }).catch(() => { stateLoaded.current = false; setSaveStatus('error') })
  }, [stored, item.contentId])
  useEffect(() => { fetch('/api/codex/status').then(async (response) => { const result = await response.json(); setCodexConnected(response.ok && result.connected === true) }).catch(() => setCodexConnected(false)) }, [])
  useEffect(() => { queueMicrotask(() => setAiDisclosureAccepted(localStorage.getItem('killcode-ai-disclosure') === 'accepted')) }, [])
  useEffect(() => { queueMicrotask(() => setSelectedModel(localStorage.getItem('killcode-ai-model') ?? '')) }, [])
  useEffect(() => { queueMicrotask(() => setSelectedEffort(localStorage.getItem('killcode-ai-effort') ?? '')) }, [])
  useEffect(() => {
    if (toolPanel !== 'ai' || aiModels.length) return
    let active = true
    void loadModelOptions().then((models) => { if (active) setAiModels(models) })
    return () => { active = false }
  }, [aiModels.length, toolPanel])
  useEffect(() => {
    if (toolPanel !== 'ai') return
    const container = document.querySelector<HTMLElement>('.chat-panel .messages')
    if (!container) return
    followLatestMessage.current = true
    const updateFollowState = () => {
      followLatestMessage.current = container.scrollHeight - container.scrollTop - container.clientHeight < 80
    }
    container.addEventListener('scroll', updateFollowState, { passive: true })
    const frame = requestAnimationFrame(() => { container.scrollTop = container.scrollHeight })
    return () => { cancelAnimationFrame(frame); container.removeEventListener('scroll', updateFollowState) }
  }, [mobilePanelOpen, toolPanel])
  const latestMessage = messages.at(-1)
  useEffect(() => {
    if (toolPanel !== 'ai' || !followLatestMessage.current) return
    const container = document.querySelector<HTMLElement>('.chat-panel .messages')
    if (!container) return
    const frame = requestAnimationFrame(() => { container.scrollTop = container.scrollHeight })
    return () => cancelAnimationFrame(frame)
  }, [latestMessage?.content, latestMessage?.status, messages.length, toolPanel])
  useEffect(() => {
    const savedPanelWidth = Number(localStorage.getItem('killcode-tool-panel-width'))
    const savedEditorHeight = Number(localStorage.getItem('killcode-editor-height'))
    queueMicrotask(() => {
      if (Number.isFinite(savedPanelWidth) && savedPanelWidth >= 340) setPanelWidth(savedPanelWidth)
      if (Number.isFinite(savedEditorHeight) && savedEditorHeight >= 260) setEditorHeight(savedEditorHeight)
    })
  }, [])
  useEffect(() => {
    if (!draftReady) return
    const timer = setTimeout(() => saveJournaledDraft(item.contentId).then(() => setSaveStatus('saved')).catch(() => setSaveStatus('error')), 400)
    return () => clearTimeout(timer)
  }, [draftReady, item.contentId, state.noteMarkdown, state.pseudocode])
  useEffect(() => {
    if (!draftReady) return
    const flush = () => { void saveJournaledDraft(item.contentId, true).catch(() => {}) }
    const saveShortcut = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); setSaveStatus('saving'); void saveJournaledDraft(item.contentId).then(() => setSaveStatus('saved')).catch(() => setSaveStatus('error')) } }
    const hide = () => { if (document.visibilityState === 'hidden') flush() }
    const synced = () => { if (!localStorage.getItem(`killcode-draft-${item.contentId}`)) setSaveStatus('saved') }
    addEventListener('pagehide', flush); addEventListener('keydown', saveShortcut); document.addEventListener('visibilitychange', hide); addEventListener('killcode-storage-synced', synced)
    return () => { flush(); removeEventListener('pagehide', flush); removeEventListener('keydown', saveShortcut); document.removeEventListener('visibilitychange', hide); removeEventListener('killcode-storage-synced', synced) }
  }, [draftReady, item.contentId])
  useEffect(() => {
    const pane = document.querySelector<HTMLElement>('.primary-pane')
    if (!pane) return
    if (state.lastReadAnchor) setTimeout(() => document.getElementById(state.lastReadAnchor!)?.scrollIntoView(), 0)
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.find((entry) => entry.isIntersecting)
      if (visible?.target.id) void patchProblemState(item.contentId, { lastReadAnchor: visible.target.id })
    }, { root: pane, rootMargin: '0px 0px -70% 0px' })
    pane.querySelectorAll<HTMLElement>('h2[id], h3[id]').forEach((heading) => observer.observe(heading))
    return () => observer.disconnect()
  }, [item.contentId, state.lastReadAnchor])

  const updateState = (patch: Partial<ProblemState>, immediate = false) => {
    if ('noteMarkdown' in patch || 'pseudocode' in patch) {
      journalDraft(item.contentId, patch.noteMarkdown ?? state.noteMarkdown, patch.pseudocode ?? state.pseudocode)
      setSaveStatus('saving')
    }
    setState((current) => ({ ...current, ...patch }))
    if (immediate) void patchProblemState(item.contentId, patch).catch(() => setSaveStatus('error'))
  }

  const defaultModel = aiModels.find((model) => model.isDefault)
  const effectiveModel = selectedModel || defaultModel?.model
  const activeModel = aiModels.find((model) => model.model === effectiveModel) ?? defaultModel
  const reasoningEfforts = activeModel?.supportedReasoningEfforts ?? []
  const effectiveEffort = reasoningEfforts.some((option) => option.reasoningEffort === selectedEffort) ? selectedEffort : undefined
  const chooseModel = (model: string) => {
    setSelectedModel(model)
    localStorage.setItem('killcode-ai-model', model)
    if (!model) updateState({ codexThreadId: undefined }, true)
  }
  const chooseEffort = (effort: string) => {
    setSelectedEffort(effort)
    if (effort) localStorage.setItem('killcode-ai-effort', effort)
    else localStorage.removeItem('killcode-ai-effort')
  }
  const toggleMaskGroup = (group: number) => {
    const groups = new Set(state.revealedMaskGroups ?? [0])
    if (groups.has(group)) groups.delete(group); else groups.add(group)
    updateState({ revealedMaskGroups: [...groups].sort((a, b) => a - b) }, true)
  }
  const addAnswerToNotes = (message: ProblemMessage) => {
    const answer = message.content.trim()
    if (!answer) return
    const current = state.noteMarkdown.trimEnd()
    updateState({ noteMarkdown: current ? `${current}\n\n---\n\n${answer}` : answer }, true)
    setAddedAnswerId(message.id)
  }

  const addFiles = async (files: File[]) => {
    setAttachmentError('')
    const remaining = 4 - attachments.length
    if (remaining <= 0) { setAttachmentError('每次最多发送 4 个附件'); return }
    const accepted: PendingAttachment[] = []
    const errors: string[] = []
    for (const file of files.slice(0, remaining)) {
      const id = crypto.randomUUID()
      if (supportedImageTypes.has(file.type)) {
        if (file.size > 4_000_000) { errors.push(`${file.name} 超过 4MB`); continue }
        accepted.push({ id, kind: 'image', name: file.name, type: file.type, size: file.size, data: await readDataUrl(file) })
      } else if (file.type.startsWith('text/') || textFileExtensions.has(fileExtension(file.name))) {
        if (file.size > 500_000) { errors.push(`${file.name} 超过 500KB`); continue }
        accepted.push({ id, kind: 'text', name: file.name, type: file.type || 'text/plain', size: file.size, content: await file.text() })
      } else errors.push(`${file.name} 不是支持的图片、文本或代码文件`)
    }
    if (files.length > remaining) errors.push('每次最多发送 4 个附件')
    const totalSize = [...attachments, ...accepted].reduce((total, file) => total + file.size, 0)
    if (totalSize > 8_000_000) setAttachmentError('附件总大小不能超过 8MB')
    else setAttachments((current) => [...current, ...accepted])
    if (errors.length) setAttachmentError(errors.join('；'))
  }

  async function ask(messageText = question, selectedAttachments = attachments) {
    const text = messageText.trim(); if ((!text && !selectedAttachments.length) || busy) return
    followLatestMessage.current = true
    setQuestion(''); setBusy(true)
    const user: ProblemMessage = { id: crypto.randomUUID(), contentId: item.contentId, role: 'user', kind: 'question', content: text || '请分析附件', attachments: selectedAttachments.map(({ name, type, size, kind }) => ({ name, type, size, kind })), status: 'pending', createdAt: new Date().toISOString() }
    const assistant: ProblemMessage = { id: crypto.randomUUID(), contentId: item.contentId, role: 'assistant', kind: 'answer', content: '', status: 'streaming', createdAt: `${user.createdAt}-assistant` }
    let streamPersistTimer: ReturnType<typeof setTimeout> | undefined
    try {
      await putMessages([user, assistant])
      const response = await fetch(`/api/problems/${item.contentId}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, attachments: selectedAttachments.map(({ kind, name, type, size, data, content }) => kind === 'image' ? { kind, name, type, size, data } : { kind, name, type, size, content }), pseudocode: state.pseudocode, threadId: state.codexThreadId, model: effectiveModel, effort: effectiveEffort, recentMessages: messages.slice(-12).map(({ role, content }) => ({ role, content })) }) })
      if (!response.ok || !response.body) throw new Error((await response.json()).error || '请求失败')
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''; let content = ''; let threadId = state.codexThreadId
      let lastPersistedAt = 0
      const persistStream = () => {
        const elapsed = Date.now() - lastPersistedAt
        if (elapsed >= 250) { lastPersistedAt = Date.now(); void patchMessage(assistant.id, { content }).catch(() => setSaveStatus('error')); return }
        streamPersistTimer ??= setTimeout(() => { streamPersistTimer = undefined; lastPersistedAt = Date.now(); void patchMessage(assistant.id, { content }).catch(() => setSaveStatus('error')) }, 250 - elapsed)
      }
      while (true) {
        const { value, done } = await reader.read(); if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop() ?? ''
        for (const line of lines) { if (!line) continue; const event = JSON.parse(line); if (event.type === 'meta') { threadId = event.threadId; updateState({ codexThreadId: threadId }, true) } else if (event.type === 'delta') { content += event.delta; persistStream() } else if (event.type === 'error') throw new Error(event.error) }
      }
      if (streamPersistTimer) { clearTimeout(streamPersistTimer); streamPersistTimer = undefined }
      await patchMessage(user.id, { status: 'completed' }); await patchMessage(assistant.id, { status: 'completed', content }); setAttachments([]); setAttachmentError(''); if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error) {
      setQuestion(text)
      try {
        await patchMessage(user.id, { status: 'failed' }); await patchMessage(assistant.id, { status: 'failed', content: error instanceof Error ? error.message : '生成失败，请重试。' })
      } catch { setSaveStatus('error') }
    } finally { if (streamPersistTimer) clearTimeout(streamPersistTimer); setBusy(false) }
  }

  async function evaluate() {
    if (state.pseudocode.trim().length < 3 || busy) return
    setBusy(true); setToolPanel('practice'); setEvaluationStatus('pending'); setEvaluationError('')
    const snapshot = state.pseudocode
    const requestMessage: ProblemMessage = { id: crypto.randomUUID(), contentId: item.contentId, role: 'user', kind: 'evaluation_request', content: '评估当前伪代码', codeSnapshot: snapshot, status: 'pending', createdAt: new Date().toISOString() }
    try {
      await putMessages([requestMessage])
      const response = await fetch(`/api/problems/${item.contentId}/evaluate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pseudocode: snapshot, threadId: state.codexThreadId, model: effectiveModel, effort: effectiveEffort }) })
      const result = await response.json(); if (!response.ok) throw new Error(result.error || '评估失败')
      updateState({ codexThreadId: result.threadId }, true)
      const evaluation = result.evaluation as EvaluationResult
      await patchMessage(requestMessage.id, { status: 'completed' })
      const evaluationId = crypto.randomUUID()
      await putMessages([{ id: evaluationId, contentId: item.contentId, role: 'assistant', kind: 'evaluation_result', content: evaluation.summary, codeSnapshot: snapshot, evaluation, status: 'completed', createdAt: `${requestMessage.createdAt}-evaluation` }])
      setSelectedEvaluationId(evaluationId)
      setEvaluationStatus('done')
    } catch (error) {
      const message = error instanceof Error ? error.message : '评估失败'
      setEvaluationStatus('failed'); setEvaluationError(message)
      try { await patchMessage(requestMessage.id, { status: 'failed', content: message }) }
      catch { setSaveStatus('error') }
    } finally { setBusy(false) }
  }

  const openTool = (panel: 'practice' | 'notes' | 'ai') => { setToolPanel(panel); setMobilePanelOpen(true) }

  const startPanelResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (matchMedia('(max-width: 820px)').matches) return
    event.preventDefault()
    const bounds = event.currentTarget.parentElement?.getBoundingClientRect()
    if (!bounds) return
    let latest = panelWidth
    const move = (pointer: PointerEvent) => {
      latest = Math.round(Math.min(Math.max(bounds.right - pointer.clientX, 340), bounds.width * .62))
      setPanelWidth(latest)
    }
    const stop = () => {
      localStorage.setItem('killcode-tool-panel-width', String(latest))
      document.body.style.cursor = ''; document.body.style.userSelect = ''
      removeEventListener('pointermove', move); removeEventListener('pointerup', stop)
    }
    document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'
    addEventListener('pointermove', move); addEventListener('pointerup', stop, { once: true })
  }

  const startEditorResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const startY = event.clientY; const startHeight = editorHeight; let latest = editorHeight
    const move = (pointer: PointerEvent) => {
      latest = Math.round(Math.min(Math.max(startHeight + pointer.clientY - startY, 260), 1100))
      setEditorHeight(latest)
    }
    const stop = () => {
      localStorage.setItem('killcode-editor-height', String(latest))
      document.body.style.cursor = ''; document.body.style.userSelect = ''
      removeEventListener('pointermove', move); removeEventListener('pointerup', stop)
    }
    document.body.style.cursor = 'row-resize'; document.body.style.userSelect = 'none'
    addEventListener('pointermove', move); addEventListener('pointerup', stop, { once: true })
  }

  return <div className="problem-page">
    <div className="workspace" style={{ '--tool-panel-width': `${panelWidth}px` } as CSSProperties}>
      <section className="primary-pane">
        <div className="reader-toolbar"><Link href={collectionId ? `/collections/${collectionId}` : "/"} className="back" aria-label={collectionId ? `返回${collectionLabel}` : "返回学习路线"}><ChevronLeft/></Link><div className="reader-actions"><button type="button" className={`reader-mask-toggle ${state.readingMaskEnabled ? 'active' : ''}`} aria-pressed={Boolean(state.readingMaskEnabled)} onClick={() => updateState({ readingMaskEnabled: !state.readingMaskEnabled, revealedMaskGroups: state.revealedMaskGroups ?? [0] }, true)}><EyeOff/>使用遮罩</button><a className="reader-source" href={item.sourceUrl} target="_blank" rel="noreferrer">查看原文 <ExternalLink/></a><button className={`icon-button ${state.isBookmarked ? 'selected' : ''}`} onClick={() => updateState({ isBookmarked: !state.isBookmarked }, true)} aria-label={state.isBookmarked ? '取消收藏' : '收藏'}><Bookmark fill={state.isBookmarked ? 'currentColor' : 'none'}/></button></div></div>
        {item.study && <div className="collection-context"><strong>{collectionLabel} · 第 {item.study.order}/{collectionSize} 题 · {item.study.difficulty} · {item.study.priority}</strong><span>{item.study.focus}</span></div>}
        <ReadingMask enabled={Boolean(state.readingMaskEnabled)} revealedGroups={state.revealedMaskGroups ?? [0]} onToggleGroup={toggleMaskGroup}><MarkdownView sourceUrl={item.sourceUrl} sourcePath={item.sourcePath} linkMap={linkMap}>{markdown}</MarkdownView></ReadingMask>
      </section>
      <div className="workspace-resizer" role="separator" aria-label="调整题目与练习区宽度" aria-orientation="vertical" tabIndex={0} onPointerDown={startPanelResize} onKeyDown={(event) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { const nextWidth = Math.min(Math.max(panelWidth + (event.key === 'ArrowLeft' ? 24 : -24), 340), 760); setPanelWidth(nextWidth); localStorage.setItem('killcode-tool-panel-width', String(nextWidth)) } }}/>
      <aside className={`learning-panel ${mobilePanelOpen ? 'mobile-open' : ''}`}>
        <div className="panel-tabs" role="tablist" aria-label="学习工具">
          <button role="tab" aria-selected={toolPanel === 'practice'} className={toolPanel === 'practice' ? 'active' : ''} onClick={() => setToolPanel('practice')}><Code2/>练习</button>
          <button role="tab" aria-selected={toolPanel === 'notes'} className={toolPanel === 'notes' ? 'active' : ''} onClick={() => setToolPanel('notes')}><NotebookPen/>笔记</button>
          <button role="tab" aria-selected={toolPanel === 'ai'} className={toolPanel === 'ai' ? 'active' : ''} onClick={() => setToolPanel('ai')}><MessageSquare/>AI</button>
          <button className="mobile-close" onClick={() => setMobilePanelOpen(false)} aria-label="关闭学习工具"><X/></button>
        </div>
        {toolPanel === 'practice' && <div className="practice-pane"><header><div><h2>伪代码</h2><small><Check/> {saveStatus === 'saving' ? '保存中…' : saveStatus === 'error' ? '保存失败' : '草稿已保存到本机'}</small></div><div><button className="button subtle" disabled={!draftReady} onClick={() => updateState({ pseudocode: '' })}>清空</button><button className="button primary" disabled={!draftReady || busy || state.pseudocode.trim().length < 3} onClick={evaluate}>{busy ? <LoaderCircle className="spin"/> : <Sparkles/>}AI 评估</button></div></header>{draftReady && <PseudocodeVersions contentId={item.contentId} code={state.pseudocode} onLoad={(pseudocode) => updateState({ pseudocode })}/> }<div className="practice-editor" style={{ height: editorHeight }}>{draftReady ? <CodeEditor value={state.pseudocode} onChange={(pseudocode) => updateState({ pseudocode })}/> : <div className="editor-loading">正在读取本机草稿…</div>}</div><div className="editor-resizer" role="separator" aria-label="调整伪代码编辑器高度" aria-orientation="horizontal" tabIndex={0} onPointerDown={startEditorResize} onKeyDown={(event) => { if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { const nextHeight = Math.min(Math.max(editorHeight + (event.key === 'ArrowDown' ? 36 : -36), 260), 1100); setEditorHeight(nextHeight); localStorage.setItem('killcode-editor-height', String(nextHeight)) } }}><span/></div>{(latestEvaluation || evaluationStatus !== 'idle') && <div className="evaluation-column">{evaluationMessages.length > 1 && <select aria-label="评估历史" value={selectedEvaluationMessage?.id} onChange={(event) => setSelectedEvaluationId(event.target.value)}>{[...evaluationMessages].reverse().map((message, index) => <option key={message.id} value={message.id}>第 {evaluationMessages.length - index} 次 · {new Date(message.createdAt.split('-evaluation')[0]).toLocaleString('zh-CN')}</option>)}</select>}{latestEvaluation ? <><EvaluationView evaluation={latestEvaluation}/><details className="code-snapshot"><summary>查看本次伪代码快照</summary><pre>{selectedEvaluationMessage?.codeSnapshot}</pre></details></> : <div className="evaluation-placeholder">{evaluationStatus === 'pending' ? <LoaderCircle className="spin"/> : <Bot/>}<h2>{evaluationStatus === 'failed' ? '评估失败' : '正在评估'}</h2><p>{evaluationStatus === 'failed' ? evaluationError : 'AI 正在检查正确性、边界、反例和复杂度。'}</p></div>}</div>}</div>}
        {toolPanel === 'notes' && <div className="notes-pane"><header><div><h2>本题笔记</h2><small>{saveStatus === 'saving' ? '保存中…' : saveStatus === 'error' ? '保存失败' : '已保存到本机'}</small></div><div className="note-mode-toggle" role="group" aria-label="笔记显示方式"><button type="button" aria-pressed={noteMode === 'edit'} onClick={() => setNoteMode('edit')}>编辑</button><button type="button" aria-pressed={noteMode === 'preview'} onClick={() => setNoteMode('preview')}>预览</button></div></header>{noteMode === 'edit' ? <textarea disabled={!draftReady} className="notes-editor" value={state.noteMarkdown} onChange={(event) => updateState({ noteMarkdown: event.target.value })} placeholder="支持 Markdown：记录关键点、错误、边界条件和复盘…"/> : <div className="notes-preview">{state.noteMarkdown.trim() ? <MarkdownView>{state.noteMarkdown}</MarkdownView> : <p className="notes-empty">还没有笔记。切换到“编辑”开始记录。</p>}</div>}</div>}
        {toolPanel === 'ai' && <div className="chat-panel"><header><div><h2>本题 AI</h2><span className={`connection ${codexConnected ? 'connected' : ''}`}>{codexConnected === null ? '检查中' : codexConnected ? 'Codex 已连接' : 'Codex 未连接'}</span></div><p>对话只绑定当前题目，不读取其他题目的记录。</p><div className="ai-model-row"><select aria-label="AI 模型" value={selectedModel} disabled={!codexConnected || busy} onChange={(event) => chooseModel(event.target.value)}><option value="">跟随 Codex 默认{defaultModel ? ` · ${defaultModel.displayName}` : ''}</option>{selectedModel && !aiModels.some((model) => model.model === selectedModel) && <option value={selectedModel}>{selectedModel}</option>}{aiModels.map((model) => <option key={model.id} value={model.model}>{model.displayName}</option>)}</select><select aria-label="推理强度" value={effectiveEffort ?? ''} disabled={!codexConnected || busy || !reasoningEfforts.length} onChange={(event) => chooseEffort(event.target.value)}><option value="">跟随默认{activeModel?.defaultReasoningEffort ? ` · ${reasoningEffortLabels[activeModel.defaultReasoningEffort] ?? activeModel.defaultReasoningEffort}` : ''}</option>{reasoningEfforts.map((option) => <option key={option.reasoningEffort} value={option.reasoningEffort} title={option.description}>{reasoningEffortLabels[option.reasoningEffort] ?? option.reasoningEffort}</option>)}</select><button type="button" className="sync-model" disabled={(!selectedModel && !selectedEffort) || busy} onClick={() => { chooseModel(''); chooseEffort('') }}><RefreshCw/>同步默认</button></div></header>{!aiDisclosureAccepted && <div className="ai-disclosure"><strong>首次使用说明</strong><p>提问会把当前题目、伪代码和最近对话发送给本机 Codex 服务；内容可能由 Codex 按你的订阅设置处理。</p><button className="button primary" onClick={() => { localStorage.setItem('killcode-ai-disclosure', 'accepted'); setAiDisclosureAccepted(true) }}>我知道了</button></div>}<div className="messages">{messages.filter((message) => message.kind === 'question' || message.kind === 'answer').map((message) => <article className={message.role} key={message.id}><small>{message.role === 'user' ? '你' : 'AI'}</small><div><MarkdownView>{message.content || '正在思考…'}</MarkdownView>{message.attachments?.length ? <div className="message-attachments">{message.attachments.map((attachment, index) => <span key={`${attachment.name}-${index}`}>{attachment.kind === 'image' ? <Image/> : <FileText/>}{attachment.name}</span>)}</div> : null}{message.role === 'assistant' && message.status === 'completed' && message.content && <div className="message-actions"><button type="button" disabled={addedAnswerId === message.id} onClick={() => addAnswerToNotes(message)}>{addedAnswerId === message.id ? <Check/> : <NotebookPen/>}{addedAnswerId === message.id ? '已添加到笔记' : '添加到笔记'}</button></div>}{message.status === 'failed' && <><em>请求失败，输入已保留。</em>{message.role === 'user' ? <button className="retry-link" onClick={() => ask(message.content, [])}>重试</button> : null}</>}</div></article>)}{!messages.some((message) => message.kind === 'question' || message.kind === 'answer') && <div className="chat-empty"><Bot/><h3>从你的疑问开始</h3><p>可以问边界条件、循环不变量或复杂度。</p></div>}</div><div className="quick-prompts">{['给我一个提示','检查边界条件','解释复杂度'].map((prompt) => <button key={prompt} onClick={() => ask(prompt)}> {prompt}</button>)}</div><form onSubmit={(event) => { event.preventDefault(); void ask() }}>{attachments.length ? <div className="pending-attachments">{attachments.map((attachment) => <span key={attachment.id}>{attachment.kind === 'image' ? <Image/> : <FileText/>}<span title={attachment.name}>{attachment.name}</span><button type="button" aria-label={`移除 ${attachment.name}`} onClick={() => setAttachments((current) => current.filter((item) => item.id !== attachment.id))}><X/></button></span>)}</div> : null}{attachmentError && <small className="attachment-error">{attachmentError}</small>}<textarea value={question} onChange={(event) => setQuestion(event.target.value)} onPaste={(event) => { const files = [...event.clipboardData.files]; if (files.length) { event.preventDefault(); void addFiles(files) } }} onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === 'NumpadEnter') && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (aiDisclosureAccepted && !busy && (question.trim() || attachments.length)) event.currentTarget.form?.requestSubmit() } }} placeholder="输入问题，Enter 发送，Shift+Enter 换行…"/><input ref={fileInputRef} hidden type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif,text/*,.md,.markdown,.json,.csv,.ts,.tsx,.js,.jsx,.py,.java,.c,.cc,.cpp,.h,.hpp,.go,.rs,.html,.css,.sql,.xml,.yaml,.yml,.toml,.log,.sh,.ps1" onChange={(event) => { void addFiles([...(event.target.files ?? [])]); event.target.value = '' }}/><button className="attach-button" type="button" aria-label="添加图片或文件" title="添加图片或文件" disabled={busy || attachments.length >= 4} onClick={() => fileInputRef.current?.click()}><Paperclip/></button><button className="send-button" disabled={!aiDisclosureAccepted || busy || (!question.trim() && !attachments.length)} aria-label="发送">{busy ? <LoaderCircle className="spin"/> : <Send/>}</button></form></div>}
      </aside>
    </div>
    <footer className="problem-footer"><Link className={previous ? '' : 'disabled'} href={previous ? problemHref(previous) : '#'}>← 上一篇</Link><button onClick={() => updateState({ status: state.status === 'completed' ? 'in_progress' : 'completed' }, true)}>{state.status === 'completed' ? '标记为学习中' : '标记完成'}</button><Link className={next ? '' : 'disabled'} href={next ? problemHref(next) : '#'}>下一篇 →</Link></footer>
    <div className="mobile-study-tools"><button onClick={() => openTool('practice')}><Code2/>练习</button><button onClick={() => openTool('notes')}><NotebookPen/>笔记</button><button onClick={() => openTool('ai')}><MessageSquare/>AI{messages.length ? <span>{messages.length}</span> : null}</button></div>
  </div>
}
