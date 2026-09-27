import Link from 'next/link'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { MarkdownView } from '@/components/markdown/markdown-view'

export default async function GraphCoverageGuidePage() {
  const markdown = await readFile(path.join(process.cwd(), 'content', 'study-guides', 'graph-coverage.md'), 'utf8')
  return <article className="study-guide">
    <header className="page-header"><div><p className="eyebrow">CBMS 图论专项补充</p><h1>图论：考点覆盖与补充学习</h1><p>10 个纸笔专项，附真题、材料、练习要求与复杂度训练。</p></div></header>
    <nav className="study-guide-links" aria-label="补充说明导航">
      <Link className="button" href="/collections/graph-50">返回图论合集</Link>
      <a className="button" href="#二-十个必补专项">纸笔专项</a>
      <a className="button" href="#三-复杂度也要专门练">复杂度训练</a>
    </nav>
    <MarkdownView>{markdown}</MarkdownView>
  </article>
}
