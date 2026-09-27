import { AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react'
import type { EvaluationResult } from '@/lib/types'

export function EvaluationView({ evaluation }: { evaluation: EvaluationResult }) {
  const good = evaluation.verdict === 'good'
  return <div className="evaluation-view">
    <div className={`verdict ${good ? 'good' : ''}`}>{good ? <CheckCircle2/> : <AlertCircle/>}<div><small>思路评估</small><strong>{good ? '思路可行' : evaluation.verdict === 'incomplete' ? '信息不足' : '需要修正'}</strong></div></div>
    <p className="evaluation-summary">{evaluation.summary}</p>
    <section><h3>主要问题</h3>{evaluation.findings.length ? evaluation.findings.map((finding, index) => <article className={`finding ${finding.severity}`} key={`${finding.title}-${index}`}><strong>{finding.line ? `第 ${finding.line} 行 · ` : ''}{finding.title}</strong><p>{finding.detail}</p></article>) : <p>没有发现明显的思路缺陷。</p>}</section>
    <section><h3>边界与反例</h3>{evaluation.counterexamples.length ? <ul>{evaluation.counterexamples.map((item) => <li key={item}>{item}</li>)}</ul> : <p>暂未发现决定性反例。</p>}</section>
    <section><h3>复杂度</h3><p>时间：{evaluation.timeComplexity}</p><p>空间：{evaluation.spaceComplexity}</p></section>
    <section className="next-step"><h3><ArrowRight/>下一步</h3><p>{evaluation.nextStep}</p></section>
    <small className="disclaimer">AI 评估属于静态思路分析，未实际编译、运行或验证代码。</small>
  </div>
}
