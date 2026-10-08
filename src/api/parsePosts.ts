import type { Post } from '../features/posts/types.ts'

/** The response is not what the API promises: a list of posts. */
export class ApiShapeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiShapeError'
  }
}

type Json = Record<string, unknown>

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A string with something in it: the only kind of value an id, a title or a name can be. */
function isFilled(value: unknown): value is string {
  return typeof value === 'string' && value !== ''
}

function textOf(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function parseCategories(value: unknown): Post['categories'] {
  if (!Array.isArray(value)) return []
  return value.flatMap((category: unknown) =>
    isRecord(category) && isFilled(category.name)
      ? [{ id: textOf(category.id), name: category.name }]
      : [],
  )
}

/** One item of the response, or null when it cannot be a post: no id, no title or no author name. */
function parsePost(item: unknown, apiIndex: number): Post | null {
  if (!isRecord(item)) return null
  const { id, title, author } = item
  if (!isFilled(id) || !isFilled(title)) return null
  if (!isRecord(author) || !isFilled(author.name)) return null
  return {
    id,
    title,
    content: textOf(item.content),
    thumbnailUrl: textOf(item.thumbnail_url),
    createdAt: textOf(item.createdAt),
    author: {
      id: textOf(author.id),
      name: author.name,
      profilePicture: textOf(author.profilePicture),
    },
    categories: parseCategories(item.categories),
    apiIndex,
  }
}

/**
 * Turns the body of GET /posts/ into posts. A body that is not a list throws
 * ApiShapeError; an item that cannot be a post is dropped, and `apiIndex` keeps
 * the position every post had in the response, gaps included.
 */
export function parsePosts(raw: unknown): Post[] {
  if (!Array.isArray(raw)) {
    throw new ApiShapeError(
      `Expected a list of posts, got ${raw === null ? 'null' : typeof raw}`,
    )
  }
  return raw.flatMap((item: unknown, apiIndex) => {
    const post = parsePost(item, apiIndex)
    return post ? [post] : []
  })
}
