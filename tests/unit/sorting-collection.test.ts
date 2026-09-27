import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import path from 'node:path'
import index from '@/content/generated/index.json'
import collection from '@/content/generated/sorting-100.json'
import manifest from '@/content/collections/sorting-100.json'
import type { ContentItem } from '@/lib/types'

describe('sorting collection', () => {
  it('keeps all 100 selected problems in their learning order with valid sources', () => {
    expect(collection.entries).toHaveLength(100)
    expect(new Set(collection.entries.map((entry) => entry.contentId)).size).toBe(100)
    expect(collection.entries.map((entry) => entry.number)).toEqual(manifest.entries.map((entry) => entry.number))
    expect(collection.entries.map((entry) => entry.order)).toEqual(Array.from({ length: 100 }, (_, i) => i + 1))
    for (const entry of collection.entries) {
      const item = (index as ContentItem[]).find((item) => item.contentId === entry.contentId)
      expect(item?.number).toBe(entry.number)
      expect(existsSync(path.join(process.cwd(), 'content', item?.sourceRoot ?? 'upstream', item!.sourcePath))).toBe(true)
    }
  })

  it('shares existing content IDs and progresses through difficulty in each of 8 modules', () => {
    for (const number of [977, 242, 15, 18, 347, 56, 922, 1356, 1365]) {
      const existing = index.find((item) => item.number === number && item.sourcePath.startsWith('problems/'))!
      expect(collection.entries.find((entry) => entry.number === number)?.contentId).toBe(existing.contentId)
    }
    const groups = Object.groupBy(collection.entries, (entry) => entry.group)
    expect(Object.keys(groups)).toHaveLength(8)
    const rank: Record<string, number> = { 简单: 0, 中等: 1, 困难: 2 }
    for (const entries of Object.values(groups)) {
      const levels = entries!.map((entry) => rank[entry.difficulty])
      expect(levels).toEqual([...levels].sort((a, b) => a - b))
    }
  })
})
