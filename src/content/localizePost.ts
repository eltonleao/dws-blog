import type { Post } from '../features/posts/types.ts'
import type { ContentMap } from './parseContent.ts'

/**
 * The post with the title and the content written for it in the language of
 * `content`. A post with no written text (one the API added later) and a map
 * that has not arrived, or failed, leave the post of the API as it is.
 */
export function localizePost(post: Post, content: ContentMap | undefined): Post {
  if (content === undefined || !Object.hasOwn(content, post.id)) return post
  const { title, content: text } = content[post.id]
  return { ...post, title, content: text }
}
