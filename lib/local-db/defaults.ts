import type { ProblemState } from '@/lib/types'

export function defaultState(contentId: string): ProblemState {
  const now = new Date().toISOString()
  return { contentId, status: 'not_started', isBookmarked: false, readingMaskEnabled: false, revealedMaskGroups: [0], noteMarkdown: '', pseudocode: '', lastOpenedAt: now, updatedAt: now }
}
