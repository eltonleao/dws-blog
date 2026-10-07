import type { Post, SortOrder } from './types'

/**
 * A copy of `posts`, newest or oldest first by `createdAt`. A tie falls back to
 * `apiIndex`, in the same direction: with the equal dates the API sends, Newest
 * is the API order and Oldest is its inverse. A date that does not parse goes
 * last in both orders, and the posts without a date tie with each other.
 */
export function sortPosts(posts: Post[], order: SortOrder): Post[] {
  const direction = order === 'newest' ? 1 : -1
  return [...posts].sort((a, b) => {
    const timeA = Date.parse(a.createdAt)
    const timeB = Date.parse(b.createdAt)
    const hasDateA = Number.isFinite(timeA)
    const hasDateB = Number.isFinite(timeB)
    if (hasDateA !== hasDateB) return hasDateA ? -1 : 1
    if (hasDateA && timeA !== timeB) return direction * (timeB - timeA)
    return direction * (a.apiIndex - b.apiIndex)
  })
}
