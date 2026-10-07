export interface Post {
  id: string
  title: string
  content: string
  thumbnailUrl: string
  createdAt: string
  author: { id: string; name: string; profilePicture: string }
  categories: { id: string; name: string }[]
  /** Position of the post in the API response: the tie-breaker of every sort. */
  apiIndex: number
}

export type SortOrder = 'newest' | 'oldest'

/** What the filters hold: category names and author ids. An empty list does not filter. */
export interface FilterSelection {
  categories: string[]
  authors: string[]
}

/** One entry of a filter dropdown or sidebar. */
export interface FilterOption {
  value: string
  label: string
}
