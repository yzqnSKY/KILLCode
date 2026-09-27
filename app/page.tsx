import { getContentItems } from '@/lib/content'
import { Roadmap } from '@/components/roadmap/roadmap'
import { Suspense } from 'react'

export default function Home() {
  return <Suspense fallback={<div className="roadmap-page">正在加载学习路线…</div>}><Roadmap items={getContentItems()} /></Suspense>
}
