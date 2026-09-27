import index from '../content/generated/index.json'
import sorting from '../content/generated/sorting-100.json'
import dp from '../content/generated/dynamic-programming-100.json'
import graph from '../content/generated/graph-50.json'
import statements from '../content/leetcode/manifest.json'
import type { ContentItem } from '../lib/types'
import { createHash } from 'node:crypto'
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
for (const [collection, count] of [[sorting, 100], [dp, 100], [graph, 65]] as const) {
  if (collection.entries.length !== count || new Set(collection.entries.map((entry) => entry.contentId)).size !== count) errors.push(`Invalid ${collection.id} count or duplicate content`)
  for (const [position, entry] of collection.entries.entries()) {
    if (!ids.has(entry.contentId)) errors.push(`Missing collection item: ${entry.number}`)
    if (entry.order !== position + 1) errors.push(`Invalid collection order: ${entry.number}`)
  }
}
const statementByNumber = new Map(statements.map((entry) => [entry.number, entry]))
const collectionNumbers = new Set([sorting, dp, graph].flatMap((collection) => collection.entries.map((entry) => entry.number)))
if (statements.length !== collectionNumbers.size || statementByNumber.size !== collectionNumbers.size) errors.push('Incomplete or duplicate LeetCode statements')
for (const number of collectionNumbers) {
  const statement = statementByNumber.get(number)
  if (!statement) { errors.push(`Missing complete statement: ${number}`); continue }
  try {
    const body = await readFile(path.join(process.cwd(), 'content', 'leetcode', `${number}.md`), 'utf8')
    if (createHash('sha256').update(body).digest('hex') !== statement.markdownSha256) errors.push(`Statement checksum mismatch: ${number}`)
    if (!body.includes('## 完整题目') || !/示例|样例/.test(body) || !/提示|约束|注意/.test(body)) errors.push(`Incomplete statement content: ${number}`)
    for (const image of statement.imagePaths) await access(path.join(process.cwd(), 'public', image.slice(1)))
  } catch { errors.push(`Missing statement file or diagram: ${number}`) }
}
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
if (warnings.length) console.warn(`${warnings.length} upstream links point to files not included in this repository snapshot.`)
console.log(`Content check passed: ${index.length} items, ${seen.size} unique slugs.`)
