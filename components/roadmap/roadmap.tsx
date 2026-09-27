'use client'

import Link from 'next/link'
import { Bookmark, Check, ChevronDown, Circle, Search } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { db, patchProblemState } from '@/lib/local-db/db'
import type { ContentCollection, ContentItem, ProblemState } from '@/lib/types'

export function Roadmap({ items, collection }: { items: ContentItem[]; collection?: Pick<ContentCollection, 'id' | 'title' | 'description'> }) {
  const searchParams = useSearchParams()
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [onlyBookmarked, setOnlyBookmarked] = useState(searchParams.get('bookmarked') === '1')
  const [openCategories, setOpenCategories] = useState(() => new Set<string>())
  const [closedCategories, setClosedCategories] = useState(() => new Set<string>())
  const liveStates = useLiveQuery(() => db.problemStates.toArray(), [])
  const states = useMemo(() => liveStates ?? [], [liveStates])
  const stateMap = useMemo(() => new Map(states.map((state) => [state.contentId, state])), [states])
  const normalized = deferredQuery.trim().toLowerCase()
  const queryTokens = normalized.split(/\s+/).filter(Boolean)
  const libraryItems = !collection && !onlyBookmarked ? items.filter((item) => item.sourceRoot !== 'local') : items
  const problemHref = (item: ContentItem) => `/problems/${item.slug}${collection ? `?collection=${collection.id}` : ''}`
  const filtered = libraryItems.filter((item) => {
    const state = stateMap.get(item.contentId)
    const searchable = `${item.number ?? ''} ${item.title} ${item.excerpt} ${item.study?.focus ?? ''} ${item.category}`.toLowerCase()
    return (!onlyBookmarked || state?.isBookmarked) && queryTokens.every((token) => searchable.includes(token))
  })
  const groups = Object.entries(Object.groupBy(filtered, (item) => item.category))
  const formalItems = libraryItems.filter((item) => item.isProblem)
  const formalIds = new Set(formalItems.map((item) => item.contentId))
  const completed = states.filter((state) => formalIds.has(state.contentId) && state.status === 'completed').length
  const current = [...states].filter((state) => formalIds.has(state.contentId) && state.status !== 'completed').sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt))[0]
  const currentItem = libraryItems.find((item) => item.contentId === current?.contentId)

  useEffect(() => {
    const listener = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.querySelector<HTMLInputElement>('#problem-search')?.focus() } }
    addEventListener('keydown', listener); return () => removeEventListener('keydown', listener)
  }, [])
  return <div className="roadmap-page">
    <header className="page-header"><div><p className="eyebrow">个人本地学习空间</p><h1>{collection?.title ?? '算法学习路线'}</h1><p>{collection?.description ?? '阅读、思考、写伪代码、向 AI 提问'}</p></div><label className="search-box"><Search/><input id="problem-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索题号、标题或正文"/><kbd>Ctrl K</kbd></label><label className="toggle"><span>只看收藏</span><input type="checkbox" checked={onlyBookmarked} onChange={(event) => setOnlyBookmarked(event.target.checked)}/><i/></label></header>
    {collection && <aside className="collection-coverage"><div><strong>这 {formalItems.length} 题覆盖到哪里？</strong><p>补充说明列出未充分覆盖的东大考点、专项题目及学习材料。</p></div><Link className="button" href={collection.id === 'graph-50' ? '/study-guides/graph-coverage' : `/study-guides/cbms-coverage#${collection.id === 'sorting-100' ? '三-排序专项补题' : '四-动态规划专项补题'}`}>阅读补充说明 →</Link></aside>}
    <section className="continue-strip">
      <div className="play-mark">▶</div><div><small>继续学习</small><strong>{currentItem?.title ?? formalItems[0]?.title ?? libraryItems[0]?.title}</strong></div><div className="total-progress"><span>题目进度 {completed}/{formalItems.length}</span><i><b style={{ width: `${formalItems.length ? Math.round(completed / formalItems.length * 100) : 0}%` }}/></i></div><Link className="button primary" href={problemHref(currentItem ?? formalItems[0] ?? libraryItems[0])}>继续 <span>→</span></Link>
    </section>
    <div className="roadmap-list">
      {groups.map(([category, categoryItems]) => {
        const list = categoryItems ?? []; const done = list.filter((item) => stateMap.get(item.contentId)?.status === 'completed').length
        const isDefault = (currentItem?.category ?? libraryItems[0]?.category) === category
        const isOpen = Boolean(normalized) || openCategories.has(category) || (isDefault && !closedCategories.has(category))
        const toggleCategory = () => {
          if (isOpen) {
            setOpenCategories((value) => { const next = new Set(value); next.delete(category); return next })
            if (isDefault) setClosedCategories((value) => new Set(value).add(category))
          } else {
            setClosedCategories((value) => { const next = new Set(value); next.delete(category); return next })
            setOpenCategories((value) => new Set(value).add(category))
          }
        }
        return <section className={`topic ${isOpen ? 'open' : 'collapsed'}`} key={category}><header onClick={toggleCategory}><ChevronDown/><h2>{category}</h2><span>{done}/{list.length}</span><i><b style={{ width: `${list.length ? done/list.length*100 : 0}%` }}/></i></header>{isOpen && <div className="topic-items">{list.map((item) => <ProblemRow key={item.contentId} item={item} href={problemHref(item)} state={stateMap.get(item.contentId)} />)}</div>}</section>
      })}
      {!groups.length && <div className="empty-state"><Search/><h2>没有匹配的题目</h2><p>试试题号、标题关键词，或关闭“只看收藏”。</p>{onlyBookmarked && <button className="button primary" onClick={() => setOnlyBookmarked(false)}>查看全部题目</button>}</div>}
    </div>
  </div>
}

function ProblemRow({ item, state, href }: { item: ContentItem; state?: ProblemState; href: string }) {
  const status = state?.status ?? 'not_started'
  return <div className={`problem-row ${item.study ? 'collection-row' : ''}`}><Link href={href}><span className="problem-number">{item.number ? `${item.number}.` : '·'}</span><span className="problem-label"><span>{item.title.replace(/^\d+[.、：:]?\s*/, '')}</span>{item.study && <small>第 {item.study.order} 题 · {item.study.difficulty} · {item.study.priority} · {item.study.focus}</small>}</span></Link><span className={`status ${status}`}>{status === 'completed' ? <Check/> : <Circle/>}{status === 'completed' ? '已完成' : status === 'in_progress' ? '学习中' : '未开始'}</span><button className={`bookmark ${state?.isBookmarked ? 'selected' : ''}`} aria-label="收藏" onClick={() => patchProblemState(item.contentId, { isBookmarked: !state?.isBookmarked })}><Bookmark fill={state?.isBookmarked ? 'currentColor' : 'none'}/></button></div>
}
