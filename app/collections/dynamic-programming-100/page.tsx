import { Suspense } from 'react'
import { getCollection, getCollectionItems } from '@/lib/content'
import { Roadmap } from '@/components/roadmap/roadmap'

export default function DynamicProgrammingCollectionPage() {
  const collection = getCollection('dynamic-programming-100')!
  const { id, title, description } = collection
  return <Suspense fallback={<div className="roadmap-page">正在加载动态规划合集…</div>}><Roadmap items={getCollectionItems(collection)} collection={{ id, title, description }} /></Suspense>
}
