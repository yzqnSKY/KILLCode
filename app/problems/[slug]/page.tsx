import { notFound } from 'next/navigation'
import { getCollection, getCollectionItems, getContentBySlug, getContentItems, getMarkdown } from '@/lib/content'
import { ProblemWorkspace } from '@/components/practice/problem-workspace'

export function generateStaticParams() {
  return getContentItems().map((item) => ({ slug: item.slug }))
}

export default async function ProblemPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ collection?: string }> }) {
  const { slug } = await params
  const item = getContentBySlug(slug)
  if (!item) notFound()
  const requestedCollection = getCollection((await searchParams).collection ?? (item.sourceRoot === 'local' ? item.sourcePath.split('/')[0] : ''))
  const collection = requestedCollection?.entries.some((entry) => entry.contentId === item.contentId) ? requestedCollection : undefined
  const items = collection ? getCollectionItems(collection) : getContentItems().filter((entry) => item.sourceRoot === 'local' || entry.sourceRoot !== 'local')
  const index = items.findIndex((entry) => entry.contentId === item.contentId)
  const linkMap = Object.fromEntries(getContentItems().map((entry) => [entry.sourcePath, entry.slug]))
  return <ProblemWorkspace item={items[index] ?? item} markdown={await getMarkdown(item)} linkMap={linkMap} previous={items[index - 1]} next={items[index + 1]} collectionId={collection?.id} collectionLabel={collection?.title.split(' · ')[0]} collectionSize={collection?.entries.length} />
}
