import path from 'node:path'

export interface RouteEntry { category: string; order: number }

export function cleanTitle(value: string) {
  return value.replace(/<[^>]+>/g, '').replace(/[*_`#]/g, '').trim()
}

export function parseOfficialRoute(readme: string) {
  const route = new Map<string, RouteEntry>()
  let category = '其他'
  let order = 0
  for (const line of readme.split(/\r?\n/)) {
    const summary = line.match(/<summary><b>([^<]+)<\/b><\/summary>/)
    if (summary) category = cleanTitle(summary[1])
    for (const match of line.matchAll(/\]\((?:\.\/)?(problems\/[^)#?]+\.md)(?:#[^)]*)?\)/g)) {
      let rel = match[1]
      try { rel = decodeURIComponent(rel) } catch { /* Keep source text. */ }
      if (!route.has(rel)) route.set(rel, { category, order: order++ })
    }
  }
  return route
}

export function normalizeMarkdown(markdown: string) {
  const aliases: Record<string, string> = {
    'c++': 'cpp', CPP: 'cpp', Cpp: 'cpp', js: 'javascript', JS: 'javascript', py: 'python', Python: 'python', JAVA: 'java', Golang: 'go', shell: 'bash', sh: 'bash',
  }
  return markdown.replace(/^```([^\s`]*)\s*$/gm, (_line, language: string) => { const normalized = language.toLowerCase(); return `\`\`\`${aliases[language] ?? aliases[normalized] ?? normalized}` })
}

export function extractLocalMarkdownLinks(markdown: string) {
  const links: string[] = []
  for (const match of markdown.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const raw = match[1].trim().replace(/^<|>$/g, '')
    if (!raw || /^(?:https?:|mailto:|data:|#)/i.test(raw)) continue
    const withoutAnchor = raw.split('#')[0].split('?')[0]
    if (withoutAnchor.toLowerCase().endsWith('.md')) {
      try { links.push(decodeURIComponent(withoutAnchor)) } catch { links.push(withoutAnchor) }
    }
  }
  return links
}

export function resolveContentLink(sourcePath: string, target: string) {
  return path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath), target))
}

export function isFormalProblem(title: string, number: number | undefined, isRouteItem: boolean) {
  return Boolean(isRouteItem && number && !/(总结|理论基础|周[一二三四五六日]|前言|序章)/.test(title))
}
