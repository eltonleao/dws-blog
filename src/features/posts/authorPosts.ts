import type { Post } from './types'

/** The posts written by one author, in the order they came. An id no post has gives an empty list. */
export function authorPosts(posts: Post[], authorId: string): Post[] {
  return posts.filter((post) => post.author.id === authorId)
}
