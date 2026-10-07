import type { Post } from '../features/posts/types'

/** A valid post with neutral values; each test overrides only what it is about. */
export function makePost(
  overrides: Partial<Post> & Pick<Post, 'id' | 'apiIndex'>,
): Post {
  return {
    title: `Post ${overrides.id}`,
    content: '',
    thumbnailUrl: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    author: { id: 'author-1', name: 'Author One', profilePicture: '' },
    categories: [],
    ...overrides,
  }
}
