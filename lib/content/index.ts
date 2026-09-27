import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import indexData from '@/content/generated/index.json'
import sortingData from '@/content/generated/sorting-100.json'
import dpData from '@/content/generated/dynamic-programming-100.json'
import graphData from '@/content/generated/graph-50.json'
import type { ContentCollection, ContentItem } from '@/lib/types'
import { normalizeMarkdown } from '@/lib/content/pipeline'

const items = indexData as ContentItem[]
const collections = [sortingData, dpData, graphData] as ContentCollection[]
const collectionProblems = new Map(collections.flatMap((collection) => collection.entries.map((entry) => [entry.contentId, entry.number] as const)))

export function getCollection(id: string) {
  return collections.find((collection) => collection.id === id)
}

export function getCollectionItems(collection: ContentCollection): ContentItem[] {
  return collection.entries.map((entry) => {
    const item = getContentById(entry.contentId)
    if (!item) throw new Error(`Missing collection content: ${entry.contentId}`)
    return { ...item, title: `${entry.number}. ${entry.title}`, category: entry.group, order: entry.order, isProblem: true,
      study: { order: entry.order, difficulty: entry.difficulty, priority: entry.priority, focus: entry.focus } }
  })
}

export function getContentItems() {
  return items
}

export function getContentBySlug(slug: string) {
  let normalized = slug
  try { normalized = decodeURIComponent(slug) } catch { /* Keep the original route value. */ }
  return items.find((item) => item.slug === normalized)
}

export function getContentById(contentId: string) {
  return items.find((item) => item.contentId === contentId)
}

export async function getMarkdown(item: ContentItem) {
  const sourceRoot = item.sourceRoot === 'local' ? 'local' : 'upstream'
  const fullPath = path.resolve(process.cwd(), 'content', sourceRoot, item.sourcePath)
  const allowedRoot = path.resolve(process.cwd(), 'content', sourceRoot) + path.sep
  if (!fullPath.startsWith(allowedRoot)) throw new Error('Invalid content path')
  const number = collectionProblems.get(item.contentId)
  const [markdown, statement] = await Promise.all([
    readFile(fullPath, 'utf8'),
    number === undefined ? Promise.resolve(null) : readFile(path.join(process.cwd(), 'content', 'leetcode', `${number}.md`), 'utf8'),
  ])
  if (statement === null) return normalizeMarkdown(markdown)
  const materials = markdown.replace(/^\uFEFF?#\s+[^\n]*\r?\n/, '').trim()
  return normalizeMarkdown(`${statement}

<details class="existing-study-material">
<summary>原有学习资料与训练重点</summary>

${materials}

</details>
`)
}
