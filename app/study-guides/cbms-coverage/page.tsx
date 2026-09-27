import Link from 'next/link'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { MarkdownView } from '@/components/markdown/markdown-view'

export default async function CoverageGuidePage() {
  const markdown = await readFile(path.join(process.cwd(), 'content', 'study-guides', 'cbms-coverage.md'), 'utf8')
  return <article className="study-guide">
    <header className="page-header"><div><p className="eyebrow">CBMS 专项补充</p><h1>排序与动态规划：考点覆盖与补充学习</h1><p>10 个排序专项、12 个动态规划专项，附材料、练习要求与达标标准。</p></div></header>
    <nav className="study-guide-links" aria-label="补充说明导航">
      <Link className="button" href="/collections/sorting-100">返回排序合集</Link>
      <Link className="button" href="/collections/dynamic-programming-100">返回动态规划合集</Link>
      <a className="button" href="#三-排序专项补题">排序补题</a>
      <a className="button" href="#四-动态规划专项补题">动态规划补题</a>
    </nav>
    <MarkdownView>{markdown}</MarkdownView>
  </article>
}
