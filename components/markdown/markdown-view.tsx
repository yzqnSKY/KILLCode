'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeRaw from 'rehype-raw'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import { memo, type ReactNode } from 'react'

const schema = { ...defaultSchema, strip: [...(defaultSchema.strip ?? []), 'style'], attributes: { ...defaultSchema.attributes, '*': [...(defaultSchema.attributes?.['*'] ?? []), 'className', 'id'], img: [...(defaultSchema.attributes?.img ?? []), 'src', 'alt', 'width', 'height'] } }

function nodeText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join('')
  if (node && typeof node === 'object' && 'props' in node) return nodeText((node as { props: { children?: ReactNode } }).props.children)
  return ''
}

export function headingId(children: ReactNode) {
  return nodeText(children).trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')
}

export function normalizeMathDelimiters(markdown: string) {
  const code: string[] = []
  const protect = (value: string) => {
    const index = code.push(value) - 1
    return `\u0000killcode-code-${index}\u0000`
  }
  const fencedCode = /(^|\n)([ \t]*)(`{3,}|~{3,})[^\n]*(?:\n[\s\S]*?\n[ \t]*\3[ \t]*(?=\n|$)|$)/g
  let normalized = markdown.replace(fencedCode, protect)
  normalized = normalized.replace(/(`+)[^`\n]*?\1/g, protect)
  normalized = normalized.replace(/\\\[([\s\S]*?)\\\]/g, (_match, formula: string) => `\n$$\n${formula.trim()}\n$$\n`)
  normalized = normalized.replace(/\\\(([^\n]*?)\\\)/g, (_match, formula: string) => `$${formula.trim()}$`)
  return normalized.replace(/\u0000killcode-code-(\d+)\u0000/g, (_match, index: string) => code[Number(index)])
}

export const MarkdownView = memo(function MarkdownView({ children, sourceUrl, sourcePath, linkMap }: { children: string; sourceUrl?: string; sourcePath?: string; linkMap?: Record<string, string> }) {
  const resolveLink = (href?: string) => {
    if (!href || href.startsWith('#') || href.startsWith('http')) return href
    if (sourcePath && linkMap) {
      try {
        const url = new URL(href, `https://killcode.local/${sourcePath}`)
        const path = decodeURIComponent(url.pathname.slice(1))
        const anchor = url.hash
        const slug = linkMap[path]
        if (slug) return `/problems/${slug}${anchor}`
      } catch { /* Fall back to the upstream source. */ }
    }
    return sourceUrl
  }
  return <div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeRaw, [rehypeSanitize, schema], rehypeKatex, [rehypeHighlight, { detect: false }]]} components={{
    h2: ({ children: heading }) => <h2 id={headingId(heading)}>{heading}</h2>,
    h3: ({ children: heading }) => <h3 id={headingId(heading)}>{heading}</h3>,
    a: ({ href, children: label }) => { const resolved = resolveLink(href); const external = resolved?.startsWith('http'); return <a href={resolved} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>{label}</a> },
    img: ({ src, alt, width, height }) => {
      const base = 'https://raw.githubusercontent.com/youngyangyang04/leetcode-master/master/'
      let resolved = typeof src === 'string' ? src : ''
      if (resolved && !resolved.startsWith('http') && !resolved.startsWith('/leetcode-assets/')) {
        try { resolved = new URL(resolved, `${base}${sourcePath ?? ''}`).href }
        catch { resolved = `${base}${resolved.replace(/^\.\//, '')}` }
      }
      // Upstream Markdown images have arbitrary remote dimensions and paths.
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={resolved} alt={alt ?? ''} width={width} height={height} loading="lazy" onClick={() => resolved && window.open(resolved, '_blank', 'noopener,noreferrer')} title="点击查看原图" />
    },
  }}>{normalizeMathDelimiters(children)}</ReactMarkdown></div>
})
