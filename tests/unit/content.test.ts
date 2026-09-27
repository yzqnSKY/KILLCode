import { describe, expect, it } from 'vitest'
import index from '@/content/generated/index.json'

describe('content index', () => {
  it('contains a substantial official learning library', () => {
    expect(index.length).toBeGreaterThan(250)
    expect(index.some((item) => item.title.includes('二分查找') && item.category === '数组')).toBe(true)
  })

  it('has stable unique identifiers and slugs', () => {
    expect(new Set(index.map((item) => item.contentId)).size).toBe(index.length)
    expect(new Set(index.map((item) => item.slug)).size).toBe(index.length)
  })
})
