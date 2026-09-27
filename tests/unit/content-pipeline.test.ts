import { describe, expect, it } from 'vitest'
import { extractLocalMarkdownLinks, isFormalProblem, normalizeMarkdown, parseOfficialRoute, resolveContentLink } from '@/lib/content/pipeline'

describe('content pipeline', () => {
  it('parses the official README route and decodes paths', () => {
    const route = parseOfficialRoute('<summary><b>数组</b></summary>\n- [704](./problems/0704.%E4%BA%8C%E5%88%86%E6%9F%A5%E6%89%BE.md)')
    expect(route.get('problems/0704.二分查找.md')).toEqual({ category: '数组', order: 0 })
  })

  it('normalizes common code fence aliases', () => {
    expect(normalizeMarkdown('```C++\na\n```\n```JS\nb\n```')).toBe('```cpp\na\n```\n```javascript\nb\n```')
  })

  it('extracts and resolves only local Markdown links', () => {
    const links = extractLocalMarkdownLinks('[a](../a.md#x) [web](https://example.com/a.md) ![img](x.png)')
    expect(links).toEqual(['../a.md'])
    expect(resolveContentLink('problems/group/b.md', links[0])).toBe('problems/a.md')
  })

  it('distinguishes formal route problems from summaries', () => {
    expect(isFormalProblem('704. 二分查找', 704, true)).toBe(true)
    expect(isFormalProblem('数组总结', 1, true)).toBe(false)
    expect(isFormalProblem('704. 二分查找', 704, false)).toBe(false)
  })
})
