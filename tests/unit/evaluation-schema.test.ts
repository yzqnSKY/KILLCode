import { describe, expect, it } from 'vitest'
import { evaluationSchema } from '@/lib/ai/schema'

describe('evaluation schema', () => {
  it('normalizes nullable line numbers from structured output', () => {
    const result = evaluationSchema.parse({ verdict: 'good', summary: '可行', findings: [{ severity: 'low', title: '清晰度', detail: '可补充注释', line: null }], counterexamples: [], timeComplexity: 'O(n)', spaceComplexity: 'O(1)', nextStep: '补充边界' })
    expect(result.findings[0].line).toBeUndefined()
  })

  it('rejects unsupported verdicts', () => {
    expect(() => evaluationSchema.parse({ verdict: 'perfect' })).toThrow()
  })
})
