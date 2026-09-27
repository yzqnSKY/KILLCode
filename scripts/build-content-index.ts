import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { ContentCollection, ContentItem } from '../lib/types'
import { cleanTitle, isFormalProblem, parseOfficialRoute } from '../lib/content/pipeline'

const root = process.cwd()
const problemsRoot = path.join(root, 'content', 'upstream', 'problems')
const output = path.join(root, 'content', 'generated', 'index.json')

async function readOfficialRoute() {
  const readme = await readFile(path.join(root, 'content', 'upstream', 'README.md'), 'utf8')
  return parseOfficialRoute(readme)
}

function slugify(value: string) {
  const ascii = value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')
  return ascii.slice(0, 72) || 'problem'
}

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(entries.map((entry) => {
    const target = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(target) : Promise.resolve(target.endsWith('.md') ? [target] : [])
  }))
  return files.flat()
}

const officialRoute = await readOfficialRoute()
const files = (await walk(problemsRoot)).sort((a, b) => a.localeCompare(b, 'zh-CN'))
const items: ContentItem[] = []

for (const [fallbackOrder, file] of files.entries()) {
  const body = await readFile(file, 'utf8')
  const rel = path.relative(path.join(root, 'content', 'upstream'), file).replaceAll('\\', '/')
  const heading = body.match(/^#\s+(.+)$/m)?.[1] ?? path.basename(file, '.md')
  const title = cleanTitle(heading)
  const routeEntry = officialRoute.get(rel)
  const nestedCategory = rel.split('/').length > 2 ? rel.split('/')[1] : '其他'
  const category = routeEntry?.category ?? nestedCategory
  const numberMatch = `${title} ${path.basename(file)}`.match(/(?:^|\D)(\d{1,4})(?:\.|、|\s|：|:)/)
  const number = numberMatch ? Number(numberMatch[1]) : undefined
  const contentId = createHash('sha1').update(rel).digest('hex').slice(0, 12)
  const slug = `${number ? `${number}-` : ''}${slugify(path.basename(file, '.md'))}-${contentId.slice(0, 6)}`
  const excerpt = cleanTitle(body.replace(/```[\s\S]*?```/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')).replace(/\s+/g, ' ').slice(0, 1600)
  items.push({
    contentId,
    slug,
    title,
    number,
    category,
    sourcePath: rel,
    sourceUrl: `https://github.com/youngyangyang04/leetcode-master/blob/master/${rel.split('/').map(encodeURIComponent).join('/')}`,
    excerpt,
    order: routeEntry?.order ?? officialRoute.size + fallbackOrder,
    isRouteItem: Boolean(routeEntry),
    isProblem: isFormalProblem(title, number, Boolean(routeEntry)),
  })
}

items.sort((a, b) => a.order - b.order)

await mkdir(path.dirname(output), { recursive: true })
// Keep sorting first so its existing content IDs also win when collections overlap.
for (const id of ['sorting-100', 'dynamic-programming-100']) {
  const collection = JSON.parse(await readFile(path.join(root, 'content', 'collections', `${id}.json`), 'utf8')) as ContentCollection
  if (collection.entries.length !== 100 || new Set(collection.entries.map((entry) => entry.number)).size !== 100) {
    throw new Error(`Collection ${id} must contain 100 distinct problems`)
  }
  for (const entry of collection.entries) {
    const existing = items.find((item) => item.number === entry.number && item.isProblem)
      ?? items.find((item) => item.number === entry.number)
    if (existing) {
      entry.contentId = existing.contentId
      continue
    }
    const sourcePath = `${id}/${entry.number}.md`
    const body = await readFile(path.join(root, 'content', 'local', sourcePath), 'utf8')
    const contentId = createHash('sha1').update(`local/${sourcePath}`).digest('hex').slice(0, 12)
    entry.contentId = contentId
    items.push({
      contentId, slug: `${id.replace(/-100$/, '')}-${entry.number}`, title: `${entry.number}. ${entry.title}`,
      number: entry.number, category: collection.title.split(' · ')[0], sourceRoot: 'local', sourcePath,
      sourceUrl: entry.url, excerpt: cleanTitle(body).replace(/\s+/g, ' ').slice(0, 1600),
      order: items.length, isRouteItem: false, isProblem: true,
    })
  }

  await writeFile(path.join(root, 'content', 'generated', `${id}.json`), JSON.stringify(collection), 'utf8')
}
await writeFile(output, JSON.stringify(items), 'utf8')
console.log(`Indexed ${items.length} Markdown documents (${items.filter((item) => item.isProblem).length} formal problems).`)
