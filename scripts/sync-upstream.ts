import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const run = promisify(execFile)
const root = process.cwd()
const upstream = path.join(root, 'content', 'upstream')
const repository = 'https://github.com/youngyangyang04/leetcode-master.git'

const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'killcode-content-sync-'))
const checkout = path.join(temporaryRoot, 'checkout')
try {
  await run('git', ['clone', '--depth', '1', repository, checkout])
  const { stdout } = await run('git', ['-C', checkout, 'rev-parse', 'HEAD'])
  await mkdir(upstream, { recursive: true })
  await cp(checkout, upstream, { recursive: true, filter: (source) => source !== path.join(checkout, '.git') })
  await mkdir(path.join(root, 'content', 'generated'), { recursive: true })
  await writeFile(path.join(root, 'content', 'generated', 'upstream.json'), JSON.stringify({ repository, commit: stdout.trim(), syncedAt: new Date().toISOString() }, null, 2), 'utf8')
} finally {
  const relative = path.relative(os.tmpdir(), temporaryRoot)
  if (relative.startsWith('killcode-content-sync-') && !relative.includes(path.sep)) {
    await rm(temporaryRoot, { recursive: true, force: true })
  }
}
await import('./build-content-index')
