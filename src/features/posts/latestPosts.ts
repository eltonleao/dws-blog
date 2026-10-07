import { sortPosts } from './sortPosts'
import type { Post } from './types'

/** The `n` newest posts other than the current one, newest first. */
export function latestPosts(posts: Post[], currentId: string, n = 3): Post[] {
  const others = posts.filter((post) => post.id !== currentId)
  return sortPosts(others, 'newest').slice(0, n)
}
