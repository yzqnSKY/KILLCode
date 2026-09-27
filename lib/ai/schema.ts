import { z } from 'zod'

export const evaluationSchema = z.object({
  verdict: z.enum(['good', 'needs_revision', 'incomplete']),
  summary: z.string(),
  findings: z.array(z.object({
    severity: z.enum(['high', 'medium', 'low']),
    title: z.string(),
    detail: z.string(),
    line: z.number().int().positive().nullable().transform((value) => value ?? undefined),
  })),
  counterexamples: z.array(z.string()),
  timeComplexity: z.string(),
  spaceComplexity: z.string(),
  nextStep: z.string(),
})

export const evaluationJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['verdict', 'summary', 'findings', 'counterexamples', 'timeComplexity', 'spaceComplexity', 'nextStep'],
  properties: {
    verdict: { type: 'string', enum: ['good', 'needs_revision', 'incomplete'] },
    summary: { type: 'string' },
    findings: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['severity', 'title', 'detail', 'line'], properties: { severity: { type: 'string', enum: ['high', 'medium', 'low'] }, title: { type: 'string' }, detail: { type: 'string' }, line: { anyOf: [{ type: 'integer', minimum: 1 }, { type: 'null' }] } } } },
    counterexamples: { type: 'array', items: { type: 'string' } },
    timeComplexity: { type: 'string' },
    spaceComplexity: { type: 'string' },
    nextStep: { type: 'string' },
  },
}
