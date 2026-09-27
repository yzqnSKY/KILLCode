import { getFileStore } from '@/lib/storage/file-store'
import type { StorageOperation } from '@/lib/storage/protocol'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function allowedOrigin(request: Request) {
  const value = request.headers.get('origin')
  if (!value) return true
  try {
    const origin = new URL(value)
    return ['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname) && origin.host === request.headers.get('host')
  } catch { return false }
}

export function GET(request: Request) {
  if (!allowedOrigin(request)) return Response.json({ error: '只允许本机页面访问' }, { status: 403 })
  try { return Response.json(getFileStore().snapshot(), { headers: { 'Cache-Control': 'no-store' } }) }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : '读取学习数据失败' }, { status: 500 }) }
}

export async function POST(request: Request) {
  if (!allowedOrigin(request)) return Response.json({ error: '只允许本机页面访问' }, { status: 403 })
  if (!request.headers.get('content-type')?.startsWith('application/json')) return Response.json({ error: '请求格式无效' }, { status: 415 })
  try { return Response.json(getFileStore().apply(await request.json() as StorageOperation)) }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : '保存学习数据失败' }, { status: 500 }) }
}
