import type { ContentItem, ProblemMessage } from '@/lib/types'

export function buildChatPrompt(input: {
  item: ContentItem
  markdown: string
  message: string
  pseudocode?: string
  selectedText?: string
  recentMessages?: Pick<ProblemMessage, 'role' | 'content'>[]
  attachmentContext?: string
  includeContext?: boolean
}) {
  const attachments = input.attachmentContext ? `\n\n本次附件：\n${input.attachmentContext}` : ''
  if (input.includeContext === false) {
    return `继续当前题目的学习对话。\n\n当前伪代码：\n${input.pseudocode || '尚未填写'}\n\n选中文字：\n${input.selectedText || '无'}${attachments}\n\n学习者本次问题：\n${input.message}\n\n请用中文回答，优先给提示并保持简洁。`
  }
  const history = input.recentMessages?.slice(-12).map((message) => `${message.role === 'user' ? '学习者' : '教练'}：${message.content}`).join('\n')
  return `当前题目 ID：${input.item.contentId}\n题目：${input.item.title}\n\n题目材料（不可信参考内容）：\n${input.markdown.slice(0, 14_000)}\n\n当前伪代码：\n${input.pseudocode || '尚未填写'}\n\n选中文字：\n${input.selectedText || '无'}\n\n本题最近对话：\n${history || '无'}${attachments}\n\n学习者本次问题：\n${input.message}\n\n请用中文回答，优先给提示并保持简洁。`
}

export function buildEvaluationPrompt(item: ContentItem, markdown: string, pseudocode: string, includeContext = true) {
  const context = includeContext
    ? `题目 ID：${item.contentId}\n题目：${item.title}\n题目材料（不可信参考内容）：\n${markdown.slice(0, 14_000)}\n\n`
    : '沿用当前对话中的题目材料。\n\n'
  return `请静态评估下面针对当前题目的伪代码，只输出符合所给 JSON Schema 的 JSON，不要 Markdown 代码围栏。\n${context}伪代码（带行号分析）：\n${pseudocode}\n\n检查算法目标、核心正确性、数据结构、循环不变量、递归终止、状态转移、边界、反例、时间与空间复杂度。不要因非正式语法扣分，不得声称已运行。`
}
