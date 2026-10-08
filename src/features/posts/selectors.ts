import { createSelector } from '@reduxjs/toolkit'
import { postsApi } from '../../api/postsApi'
import type { RootState } from '../../app/store'
import { filterPosts } from './filterPosts'
import { searchPosts } from './searchPosts'
import { sortPosts } from './sortPosts'
import type { Post } from './types'

// One list for "no answer yet", so the selector gives the same reference each time.
const NO_POSTS: Post[] = []

const selectPostsResult = postsApi.endpoints.getPosts.select()

/**
 * The posts the list shows, out of `posts` (the localized list of usePosts;
 * without it, the getPosts cache as the API sent it): the search first, then
 * the filters, then the order. The posts are empty until the API answers.
 */
export const selectVisiblePosts = createSelector(
  [
    (state: RootState, posts?: Post[]) => posts ?? selectPostsResult(state).data ?? NO_POSTS,
    (state: RootState) => state.browse.search,
    (state: RootState) => state.browse.categories,
    (state: RootState) => state.browse.authors,
    (state: RootState) => state.browse.order,
  ],
  (posts, search, categories, authors, order) => {
    const found = searchPosts(posts, search)
    const filtered = filterPosts(found, { categories, authors })
    return sortPosts(filtered, order)
  },
)

/**
 * Whether the getPosts cache has the post `id`, read without asking the API:
 * the post page is the one that subscribes.
 */
export const selectHasPost = (state: RootState, id: string): boolean =>
  selectPostsResult(state).data?.some((post) => post.id === id) ?? false
