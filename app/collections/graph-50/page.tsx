import { Suspense } from 'react'
import { getCollection, getCollectionItems } from '@/lib/content'
import { Roadmap } from '@/components/roadmap/roadmap'

export default function GraphCollectionPage() {
  const collection = getCollection('graph-50')!
  const { id, title, description } = collection
  return <Suspense fallback={<div className="roadmap-page">正在加载图论合集…</div>}><Roadmap items={getCollectionItems(collection)} collection={{ id, title, description }} /></Suspense>
}
