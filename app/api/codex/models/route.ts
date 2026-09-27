import { codexClient } from '@/lib/codex/client'

export const runtime = 'nodejs'

export async function GET() {
  try {
    return Response.json({ models: await codexClient.listModels() })
  } catch (error) {
    return Response.json({ models: [], error: error instanceof Error ? error.message : '无法读取 Codex 模型' }, { status: 503 })
  }
}
