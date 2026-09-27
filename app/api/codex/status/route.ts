import { NextResponse } from 'next/server'
import { codexClient } from '@/lib/codex/client'

export const runtime = 'nodejs'

export async function GET() {
  try {
    return NextResponse.json(await codexClient.status())
  } catch (error) {
    return NextResponse.json({ connected: false, error: error instanceof Error ? error.message : 'Codex App Server 不可用' }, { status: 503 })
  }
}
