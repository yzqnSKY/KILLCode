import { describe, expect, it } from 'vitest'
import { buildChatPrompt, buildEvaluationPrompt } from '@/lib/ai/prompt'
import type { ContentItem } from '@/lib/types'

const item: ContentItem = {
  contentId: 'problem-1', slug: 'problem-1', title: '测试题', category: '数组', sourcePath: 'problems/test.md', sourceUrl: 'https://example.com', excerpt: '', order: 1, isRouteItem: true, isProblem: true,
}

describe('AI prompts', () => {
  it('includes source material when creating a new Codex thread', () => {
    const prompt = buildChatPrompt({ item, markdown: '题目正文', message: '怎么做？', includeContext: true })
    expect(prompt).toContain('题目正文')
    expect(prompt).toContain('problem-1')
  })

  it('keeps continuation prompts compact when a thread already has context', () => {
    const prompt = buildChatPrompt({ item, markdown: '不应重复的题目正文', message: '边界条件呢？', pseudocode: 'solve()', recentMessages: [{ role: 'assistant', content: '旧回答' }], includeContext: false })
    expect(prompt).not.toContain('不应重复的题目正文')
    expect(prompt).not.toContain('旧回答')
    expect(prompt).toContain('solve()')
    expect(prompt).toContain('边界条件呢？')
  })

  it('includes current attachment material in continuation prompts', () => {
    const prompt = buildChatPrompt({ item, markdown: '', message: '帮我看看', attachmentContext: '--- 文件：solve.py ---\nprint(1)', includeContext: false })
    expect(prompt).toContain('solve.py')
    expect(prompt).toContain('print(1)')
  })

  it('omits repeated problem material from evaluations on an existing thread', () => {
    const prompt = buildEvaluationPrompt(item, '不应重复的题目正文', 'for each item', false)
    expect(prompt).not.toContain('不应重复的题目正文')
    expect(prompt).toContain('for each item')
  })
})
