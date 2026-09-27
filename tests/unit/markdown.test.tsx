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
