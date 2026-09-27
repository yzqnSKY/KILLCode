'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

const LINES_PER_GROUP = 5

export function ReadingMask({ enabled, revealedGroups, onToggleGroup, children }: { enabled: boolean; revealedGroups: number[]; onToggleGroup: (group: number) => void; children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState({ bandHeight: 150, groupCount: 0 })

  useEffect(() => {
    if (!enabled) return
    const root = rootRef.current
    const article = root?.querySelector<HTMLElement>('.markdown-body')
    if (!root || !article) return
    const measure = () => {
      const lineHeight = Number.parseFloat(getComputedStyle(article).lineHeight) || 30
      const bandHeight = Math.max(100, Math.round(lineHeight * LINES_PER_GROUP))
      setLayout({ bandHeight, groupCount: Math.ceil(article.scrollHeight / bandHeight) })
    }
    const frame = requestAnimationFrame(measure)
    const observer = new ResizeObserver(measure)
    observer.observe(article)
    return () => { cancelAnimationFrame(frame); observer.disconnect() }
  }, [enabled])

  const revealed = new Set(revealedGroups)
  return <div ref={rootRef} className={`reading-mask ${enabled ? 'enabled' : ''}`}>
    {children}
    {enabled && <div className="reading-mask-layers" aria-label="正文阅读遮罩">{Array.from({ length: layout.groupCount }, (_, group) => {
      const isRevealed = revealed.has(group)
      const startLine = group * LINES_PER_GROUP + 1
      const endLine = startLine + LINES_PER_GROUP - 1
      return isRevealed
        ? <div className="mask-band revealed" key={group} style={{ top: group * layout.bandHeight, height: layout.bandHeight }}><button type="button" onClick={() => onToggleGroup(group)} aria-label={`蒙上第 ${startLine} 到 ${endLine} 行`} title="重新蒙上"><EyeOff/></button></div>
        : <button type="button" className="mask-band covered" key={group} style={{ top: group * layout.bandHeight, height: layout.bandHeight }} onClick={() => onToggleGroup(group)} aria-label={`查看第 ${startLine} 到 ${endLine} 行`}><span><Eye/>点击查看</span></button>
    })}</div>}
  </div>
}
