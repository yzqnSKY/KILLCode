import index from '../content/generated/index.json'
import sorting from '../content/generated/sorting-100.json'
import dp from '../content/generated/dynamic-programming-100.json'
import type { ContentItem } from '../lib/types'
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { extractLocalMarkdownLinks, resolveContentLink } from '../lib/content/pipeline'

const seen = new Set<string>()
const errors: string[] = []
const warnings: string[] = []
for (const item of index as ContentItem[]) {
  if (!item.title.trim()) errors.push(`Missing title: ${item.sourcePath}`)
  if (seen.has(item.slug)) errors.push(`Duplicate slug: ${item.slug}`)
  seen.add(item.slug)
  const sourceRoot = item.sourceRoot === 'local' ? 'local' : 'upstream'
  const source = path.join(process.cwd(), 'content', sourceRoot, item.sourcePath)
  try {
    const markdown = await readFile(source, 'utf8')
    for (const target of extractLocalMarkdownLinks(markdown)) {
      const resolved = resolveContentLink(item.sourcePath, target)
      try { await access(path.join(process.cwd(), 'content', sourceRoot, resolved)) }
      catch { warnings.push(`Broken upstream Markdown link: ${item.sourcePath} -> ${target}`) }
    }
  } catch { errors.push(`Missing source: ${item.sourcePath}`) }
}
const ids = new Set(index.map((item) => item.contentId))
for (const collection of [sorting, dp]) {
  if (collection.entries.length !== 100 || new Set(collection.entries.map((entry) => entry.contentId)).size !== 100) errors.push(`Invalid ${collection.id} count or duplicate content`)
  for (const [position, entry] of collection.entries.entries()) {
    if (!ids.has(entry.contentId)) errors.push(`Missing collection item: ${entry.number}`)
    if (entry.order !== position + 1) errors.push(`Invalid collection order: ${entry.number}`)
  }
}
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
if (warnings.length) console.warn(`${warnings.length} upstream links point to files not included in this repository snapshot.`)
console.log(`Content check passed: ${index.length} items, ${seen.size} unique slugs.`)
