import { normalize } from '../../lib/normalize'
import type { Post } from './types'

/** The title, the author name and the category names: never the content. */
function searchableFields(post: Post): string[] {
  return [post.title, post.author.name, ...post.categories.map((category) => category.name)]
}

/**
 * The posts whose title, author or category contains `query`, ignoring case and
 * accents. A query that is empty once trimmed matches every post.
 */
export function searchPosts(posts: Post[], query: string): Post[] {
  const needle = normalize(query)
  if (needle === '') return posts
  return posts.filter((post) =>
    searchableFields(post).some((field) => normalize(field).includes(needle)),
  )
}
