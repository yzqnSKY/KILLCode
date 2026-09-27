import { getContentById, getMarkdown } from '@/lib/content'
import { buildEvaluationPrompt } from '@/lib/ai/prompt'
import { evaluationJsonSchema, evaluationSchema } from '@/lib/ai/schema'
import { codexClient } from '@/lib/codex/client'

export const runtime = 'nodejs'

export async function POST(request: Request, context: { params: Promise<{ contentId: string }> }) {
  const { contentId } = await context.params
  const item = getContentById(contentId)
  if (!item) return Response.json({ error: '题目不存在' }, { status: 404 })
  const body = await request.json()
  if (typeof body.pseudocode !== 'string' || body.pseudocode.trim().length < 3) return Response.json({ error: '请先写一些伪代码' }, { status: 400 })
  const model = typeof body.model === 'string' && body.model ? body.model : undefined
  const effort = typeof body.effort === 'string' && body.effort ? body.effort : undefined

  try {
    let threadId = typeof body.threadId === 'string' ? body.threadId : undefined
    let includeContext = true
    if (threadId) {
      try { await codexClient.resumeThread(threadId); includeContext = false } catch { threadId = undefined }
    }
    threadId ??= await codexClient.createThread()
    const markdown = await getMarkdown(item)
    let result
    try {
      result = await codexClient.runTurn(threadId, buildEvaluationPrompt(item, markdown, body.pseudocode, includeContext), { model, effort, outputSchema: evaluationJsonSchema })
    } catch {
      await codexClient.ensureReady()
      try { await codexClient.resumeThread(threadId) }
      catch { threadId = await codexClient.createThread(); includeContext = true }
      result = await codexClient.runTurn(threadId, buildEvaluationPrompt(item, markdown, body.pseudocode, includeContext), { model, effort, outputSchema: evaluationJsonSchema })
    }
    let parsed
    try { parsed = evaluationSchema.parse(JSON.parse(result.text)) }
    catch {
      const repaired = await codexClient.runTurn(threadId, '上一次评估输出无法解析。不要解释，只按给定 JSON Schema 重新输出同一份评估结果。', { model, effort, outputSchema: evaluationJsonSchema })
      parsed = evaluationSchema.parse(JSON.parse(repaired.text))
    }
    return Response.json({ threadId, evaluation: parsed })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '评估失败' }, { status: 503 })
  }
}
