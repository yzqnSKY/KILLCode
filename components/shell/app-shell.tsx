'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Bookmark, Check, Home, ListOrdered, GitBranch, Moon, Palette, PanelLeftClose, PanelLeftOpen, Settings, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { db, exportLocalData, importLocalData } from '@/lib/local-db/db'
import { parseBackup, type ImportPreview } from '@/lib/local-db/backup'
import { CodexConnection } from '@/components/settings/codex-connection'
import contentIndex from '@/content/generated/index.json'

type PaletteId = 'linear' | 'berry-ocean' | 'cobalt-citrus' | 'tomato-blue' | 'amber-sage'

const palettes: Array<{ id: PaletteId; name: string; description: string; colors: string[] }> = [
  { id: 'linear', name: 'Linear 紫', description: '克制、清晰的默认方案', colors: ['#8B5CF6', '#6D28D9', '#F7F8FA'] },
  { id: 'berry-ocean', name: '绯红海湾', description: '绯红操作，深海蓝链接', colors: ['#C1121F', '#003049', '#FFF4DC'] },
  { id: 'cobalt-citrus', name: '钴蓝柑橘', description: '柑橘按钮，钴蓝文本', colors: ['#FE5E32', '#1A0089', '#FFF3D6'] },
  { id: 'tomato-blue', name: '番茄蓝调', description: '钴蓝操作，番茄红强调', colors: ['#322470', '#BB240A', '#EDCC4D'] },
  { id: 'amber-sage', name: '琥珀鼠尾草', description: '琥珀操作，灰绿阅读', colors: ['#D9751E', '#48615F', '#F2CB07'] },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => 'dark')
  const [palette, setPalette] = useState<PaletteId>('linear')
  const [themeReady, setThemeReady] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<{ text: string; preview: ImportPreview; name: string } | null>(null)
  const validContentIds = useRef(new Set(contentIndex.map((item) => item.contentId)))

  useEffect(() => {
    const saved = localStorage.getItem('killcode-theme') as 'dark' | 'light' | null
    const savedPalette = localStorage.getItem('killcode-palette') as PaletteId | null
    const savedSidebar = localStorage.getItem('killcode-sidebar-collapsed') === 'true'
    queueMicrotask(() => {
      if (saved) setTheme(saved)
      if (savedPalette && palettes.some((option) => option.id === savedPalette)) setPalette(savedPalette)
      setSidebarCollapsed(savedSidebar)
      setThemeReady(true)
    })
  }, [])
  useEffect(() => {
    if (!themeReady) return
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.palette = palette
    localStorage.setItem('killcode-theme', theme)
    localStorage.setItem('killcode-palette', palette)
  }, [palette, theme, themeReady])

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current
      localStorage.setItem('killcode-sidebar-collapsed', String(next))
      return next
    })
  }

  async function downloadBackup() {
    const blob = new Blob([await exportLocalData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `killcode-backup-${new Date().toISOString().slice(0, 10)}.json`; anchor.click()
    URL.revokeObjectURL(url)
  }

  return <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
    <aside className="sidebar" aria-label="主导航">
      <Link href="/" className="brand" aria-label="KILLCode 首页"><span>K</span><strong>KILLCode</strong></Link>
      <button className="sidebar-collapse" onClick={toggleSidebar} aria-label={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'} title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}>{sidebarCollapsed ? <PanelLeftOpen/> : <PanelLeftClose/>}</button>
      <nav>
        <Link className={pathname === '/' ? 'active' : ''} href="/"><Home /> <span>学习路线</span></Link>
        <Link className={pathname === '/collections/sorting-100' ? 'active' : ''} href="/collections/sorting-100"><ListOrdered /> <span>排序合集</span></Link>
        <Link className={pathname === '/collections/dynamic-programming-100' ? 'active' : ''} href="/collections/dynamic-programming-100"><GitBranch /> <span>动态规划合集</span></Link>
        <Link href="/?bookmarked=1"><Bookmark /> <span>收藏</span></Link>
      </nav>
      <button aria-label="设置" className="settings-button" onClick={() => setSettingsOpen(true)}><Settings /><span>设置</span></button>
    </aside>
    <main className="app-main">{children}</main>
    <nav className="mobile-nav" aria-label="移动端导航">
      <Link href="/"><BookOpen/><span>路线</span></Link>
      <Link href="/collections/sorting-100"><ListOrdered/><span>排序</span></Link>
      <Link href="/collections/dynamic-programming-100"><GitBranch/><span>动态规划</span></Link>
      <Link href="/?bookmarked=1"><Bookmark/><span>收藏</span></Link>
      <button aria-label="设置" onClick={() => setSettingsOpen(true)}><Settings/><span>设置</span></button>
    </nav>
    {settingsOpen && <div className="dialog-backdrop" onMouseDown={() => setSettingsOpen(false)}>
      <section className="settings-drawer" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><p className="eyebrow">本机偏好</p><h2 id="settings-title">设置与数据</h2></div><button className="icon-button" onClick={() => setSettingsOpen(false)}>×</button></header>
        <div className="settings-section"><h3>外观</h3><button className="field-row" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Moon/> : <Sun/>}<span>{theme === 'dark' ? '深色主题' : '浅色主题'}</span><small>点击切换</small></button>
          <div className={`palette-picker ${theme === 'dark' ? 'disabled' : ''}`}><div className="palette-heading"><div><Palette/><strong>撞色方案</strong></div><small>{theme === 'dark' ? '切换到浅色模式后可选' : '按钮与文本会自动适配对比度'}</small></div><div className="palette-grid">{palettes.map((option) => <button type="button" key={option.id} disabled={theme === 'dark'} aria-label={`选择${option.name}`} aria-pressed={palette === option.id} className={`palette-option ${palette === option.id ? 'selected' : ''}`} onClick={() => setPalette(option.id)}><span className="palette-swatches" aria-hidden="true">{option.colors.map((color) => <i key={color} style={{ backgroundColor: color }}/>)}</span><span><strong>{option.name}</strong><small>{option.description}</small></span>{palette === option.id && <Check className="palette-check"/>}</button>)}</div></div>
        </div>
        <div className="settings-section"><h3>Codex 连接</h3><p>AI 提问和伪代码评估使用本机 Codex。登录信息由 Codex CLI 在本机管理。</p><CodexConnection/></div>
        <div className="settings-section"><h3>本地备份</h3><p>学习记录只保存在当前浏览器。建议定期导出 JSON；导入会按更新时间合并，不会覆盖较新的本地记录。</p><div className="button-row"><button className="button" onClick={downloadBackup}>导出数据</button><button className="button" onClick={() => fileRef.current?.click()}>导入数据</button></div><input ref={fileRef} hidden type="file" accept="application/json" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { const text = await file.text(); setPendingImport({ text, preview: parseBackup(text, validContentIds.current), name: file.name }) } catch (error) { alert(error instanceof Error ? error.message : '导入失败') } finally { event.target.value = '' } }} />
          {pendingImport && <div className="import-preview" role="status"><strong>导入预览 · {pendingImport.name}</strong><p>{pendingImport.preview.counts.problemStates} 道题目状态，{pendingImport.preview.counts.messages} 条 AI/评估记录。</p>{pendingImport.preview.unknownContentIds.length > 0 && <p>将跳过 {pendingImport.preview.unknownContentIds.length} 个当前内容库中不存在的题目 ID。</p>}<div className="button-row"><button className="button" onClick={() => setPendingImport(null)}>取消</button><button className="button primary" onClick={async () => { await importLocalData(pendingImport.text, validContentIds.current); location.reload() }}>确认合并</button></div></div>}
        </div>
        <div className="settings-section danger-zone"><h3>清空本地数据</h3><p>将删除当前浏览器中的状态、笔记、伪代码和 AI 记录。</p><button className="button danger" onClick={async () => { const count = await db.problemStates.count() + await db.messages.count(); if (confirm(`确定删除 ${count} 条本地记录吗？此操作不可撤销。`)) { await db.delete(); location.reload() } }}>清空数据</button></div>
      </section>
    </div>}
  </div>
}
