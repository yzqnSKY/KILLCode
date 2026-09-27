import { getContentById, getMarkdown } from '@/lib/content'
import { buildChatPrompt } from '@/lib/ai/prompt'
import { attachmentContext, materializeImageAttachments, parseChatAttachments } from '@/lib/ai/attachments'
import { codexClient } from '@/lib/codex/client'

export const runtime = 'nodejs'

export async function POST(request: Request, context: { params: Promise<{ contentId: string }> }) {
  const { contentId } = await context.params
  const item = getContentById(contentId)
  if (!item) return Response.json({ error: '题目不存在' }, { status: 404 })
  const body = await request.json()
  let attachments
  try { attachments = parseChatAttachments(body.attachments) }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : '附件格式不正确' }, { status: 400 }) }
  if (typeof body.message !== 'string' || (!body.message.trim() && !attachments.length)) return Response.json({ error: '问题和附件不能同时为空' }, { status: 400 })
  const model = typeof body.model === 'string' && body.model ? body.model : undefined
  const effort = typeof body.effort === 'string' && body.effort ? body.effort : undefined
  const message = body.message.trim() || '请分析我附加的材料。'
  const contextFromAttachments = attachmentContext(attachments)
  let localImages: string[] = []
  let disposeImages = async () => {}

  let threadId = typeof body.threadId === 'string' ? body.threadId : undefined
  let includeContext = true
  try {
    if (threadId) {
      try { await codexClient.resumeThread(threadId); includeContext = false } catch { threadId = undefined }
    }
    threadId ??= await codexClient.createThread()
    const materializedImages = await materializeImageAttachments(attachments)
    localImages = materializedImages.paths
    disposeImages = materializedImages.dispose
    const markdown = await getMarkdown(item)
    const getPrompt = () => buildChatPrompt({ item, markdown, message, pseudocode: body.pseudocode, selectedText: body.selectedText, recentMessages: body.recentMessages, attachmentContext: contextFromAttachments, includeContext })
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        const send = (event: object) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
        send({ type: 'meta', threadId })
        let emitted = false
        const run = () => codexClient.runTurn(threadId!, getPrompt(), { model, effort, localImages, onDelta: (delta) => { emitted = true; send({ type: 'delta', delta }) } })
        void (async () => {
          try {
            try { await run() }
            catch (error) {
              if (emitted) throw error
              await codexClient.ensureReady()
              try { await codexClient.resumeThread(threadId!) }
              catch { threadId = await codexClient.createThread(); includeContext = true; send({ type: 'meta', threadId }) }
              await run()
            }
            send({ type: 'done' })
          } catch (error) { send({ type: 'error', error: error instanceof Error ? error.message : '生成失败' }) }
          finally { await disposeImages(); controller.close() }
        })()
      },
    })
    return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' } })
  } catch (error) {
    await disposeImages()
    return Response.json({ error: error instanceof Error ? error.message : 'Codex 不可用' }, { status: 503 })
  }
}
