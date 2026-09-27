import { codexClient } from '@/lib/codex/client'

export const runtime = 'nodejs'

export async function POST() {
  try {
    return Response.json(await codexClient.reconnect())
  } catch (error) {
    return Response.json({ connected: false, error: error instanceof Error ? error.message : '无法重新连接 Codex' }, { status: 503 })
  }
}
