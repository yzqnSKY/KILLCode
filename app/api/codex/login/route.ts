import { codexClient } from '@/lib/codex/client'

export const runtime = 'nodejs'

export async function POST() {
  try {
    return Response.json(await codexClient.startChatGPTLogin())
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '无法启动 Codex 登录' }, { status: 503 })
  }
}
