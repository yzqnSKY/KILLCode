export type LearningStatus = 'not_started' | 'in_progress' | 'completed'

export interface ContentItem {
  contentId: string
  slug: string
  title: string
  number?: number
  category: string
  sourcePath: string
  sourceUrl: string
  excerpt: string
  order: number
  isRouteItem: boolean
  isProblem: boolean
  sourceRoot?: 'local'
  study?: { order: number; difficulty: string; priority: string; focus: string }
}

export interface CollectionEntry {
  contentId: string
  number: number
  title: string
  url: string
  group: string
  order: number
  priority: string
  difficulty: string
  focus: string
  summary: string
}

export interface ContentCollection {
  id: string
  title: string
  description: string
  entries: CollectionEntry[]
}

export interface EvaluationResult {
  verdict: 'good' | 'needs_revision' | 'incomplete'
  summary: string
  findings: Array<{ severity: 'high' | 'medium' | 'low'; title: string; detail: string; line?: number }>
  counterexamples: string[]
  timeComplexity: string
  spaceComplexity: string
  nextStep: string
}

export interface ProblemState {
  contentId: string
  codexThreadId?: string
  status: LearningStatus
  isBookmarked: boolean
  readingMaskEnabled?: boolean
  revealedMaskGroups?: number[]
  noteMarkdown: string
  pseudocode: string
  lastReadAnchor?: string
  lastOpenedAt: string
  updatedAt: string
}

export type MessageKind = 'question' | 'answer' | 'evaluation_request' | 'evaluation_result'

export interface MessageAttachment {
  name: string
  type: string
  size: number
  kind: 'image' | 'text'
}

export interface ProblemMessage {
  id: string
  contentId: string
  role: 'user' | 'assistant'
  kind: MessageKind
  content: string
  attachments?: MessageAttachment[]
  codeSnapshot?: string
  evaluation?: EvaluationResult
  status: 'pending' | 'streaming' | 'completed' | 'failed'
  createdAt: string
}

export interface LocalSettings {
  id: 'settings'
  theme: 'system' | 'dark' | 'light'
  tutorStyle: 'socratic' | 'direct'
  lastExportAt?: string
}
