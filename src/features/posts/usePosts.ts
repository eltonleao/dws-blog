import { weakMapMemoize } from '@reduxjs/toolkit'
import { useGetPostsQuery } from '../../api/postsApi'
import { useAppSelector } from '../../app/hooks'
import { useGetContentQuery } from '../../content/contentApi'
import { localizePost } from '../../content/localizePost'
import type { ContentMap } from '../../content/parseContent'
import { selectLocale } from '../../i18n/localeSlice'
import type { Post } from './types'

export interface UsePostsResult {
  /** The posts in the language of the store, once the API and the written text have answered. */
  posts?: Post[]
  /** No posts to show yet, and no error: the API or the text of the language is on its way. */
  isLoading: boolean
  /** The API failed. A failed text is no error: the posts come with the text of the API. */
  isError: boolean
  /** Asks the API again, for the Try again of a failed first load. */
  refetch: () => void
}

// One localized list per answer of the API and map of text, shared by every
// component that asks for it: a card gets the same post object on each render.
const localizeAll = weakMapMemoize((posts: Post[], content: ContentMap | undefined) =>
  posts.map((post) => localizePost(post, content)),
)

/**
 * The posts of the API with the text written in the language of the store,
 * for every page. The list waits for both, so the text of the API never
 * flashes before the written one; a chunk of text that fails to load leaves
 * the text of the API, and the next language switch asks for it again.
 */
export function usePosts(): UsePostsResult {
  const locale = useAppSelector(selectLocale)
  const { data, isError, refetch } = useGetPostsQuery()
  const written = useGetContentQuery(locale)
  // While the chunk of a new language loads, the text of the last one stays,
  // so a switch keeps the page, its scroll and its focus where they are.
  const content = written.isError ? undefined : (written.currentData ?? written.data)
  const settled = written.isError || content !== undefined
  const posts = data !== undefined && settled ? localizeAll(data, content) : undefined
  return { posts, isLoading: posts === undefined && !isError, isError, refetch }
}
