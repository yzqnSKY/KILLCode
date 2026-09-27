import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MarkdownView, headingId, normalizeMathDelimiters } from '@/components/markdown/markdown-view'

describe('Markdown rendering', () => {
  it('creates stable heading anchors', () => {
    expect(headingId('双指针 方法！')).toBe('双指针-方法')
  })

  it('sanitizes executable HTML', () => {
    const html = renderToStaticMarkup(<MarkdownView>{'<script>alert(1)</script><img src="x" onerror="alert(2)">'}</MarkdownView>)
    expect(html).not.toContain('<script')
    expect(html).not.toContain('onerror')
  })

  it('omits source styles without losing the problem statement', () => {
    const html = renderToStaticMarkup(<MarkdownView>{'<style>.dungeon { width: 70px; }</style><p>生命值必须大于零。</p><pre>输入：[[1]]\n输出：1</pre><p>提示：1 &lt;= n &lt;= 200</p>'}</MarkdownView>)
    expect(html).not.toContain('.dungeon')
    expect(html).toContain('生命值必须大于零。')
    expect(html).toContain('输出：1')
    expect(html).toContain('提示：1 &lt;= n &lt;= 200')
  })

  it('serves a locally stored diagram without resolving it against upstream', () => {
    const html = renderToStaticMarkup(<MarkdownView sourcePath="problems/example.md">{'<img src="/leetcode-assets/example.png" alt="题目配图" width="260" height="180" />'}</MarkdownView>)
    expect(html).toContain('src="/leetcode-assets/example.png"')
    expect(html).not.toContain('raw.githubusercontent.com')
    expect(html).toContain('width="260"')
    expect(html).toContain('height="180"')
  })

  it('renders dollar and LaTeX-style math delimiters', () => {
    const markdown = String.raw`Inline: \(n + 1\)

\[dp[n] = \frac{1}{n+1}\binom{2n}{n}\]`
    const html = renderToStaticMarkup(<MarkdownView>{markdown}</MarkdownView>)
    expect(html).toContain('class="katex"')
    expect(html).toContain('class="katex-display"')
  })

  it('does not normalize math delimiters inside code', () => {
    const markdown = 'Use `\\(literal\\)`.\n\n```text\n\\[also literal\\]\n```'
    expect(normalizeMathDelimiters(markdown)).toBe(markdown)
  })
})
