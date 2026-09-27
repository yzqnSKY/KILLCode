import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const run = promisify(execFile)
const root = process.cwd()
const upstream = path.join(root, 'content', 'upstream')
const repository = 'https://github.com/youngyangyang04/leetcode-master.git'

await mkdir(path.dirname(upstream), { recursive: true })
try {
  await run('git', ['-C', upstream, 'rev-parse', '--is-inside-work-tree'])
  await run('git', ['-C', upstream, 'pull', '--ff-only'])
} catch {
  await run('git', ['clone', '--depth', '1', repository, upstream])
}
const { stdout } = await run('git', ['-C', upstream, 'rev-parse', 'HEAD'])
await mkdir(path.join(root, 'content', 'generated'), { recursive: true })
await writeFile(path.join(root, 'content', 'generated', 'upstream.json'), JSON.stringify({ repository, commit: stdout.trim(), syncedAt: new Date().toISOString() }, null, 2), 'utf8')
await import('./build-content-index')
