import { expect, it } from 'vitest'
import { parsePosts } from '../../api/parsePosts'
import { postsApi } from '../../api/postsApi'
import { makeStore } from '../../app/store'
import rawPosts from '../../test/fixtures/posts.json'
import {
  categoryToggled,
  orderToggled,
  searchChanged,
} from '../browse/browseSlice'
import { selectVisiblePosts } from './selectors'
import type { Post } from './types'

// A store whose getPosts cache holds `posts`, with the search "a", the
// Technology filter and the Oldest order set through the browse actions.
async function visibleTitles(posts: Post[]) {
  const store = makeStore({})
  await store.dispatch(postsApi.util.upsertQueryData('getPosts', undefined, posts))
  store.dispatch(searchChanged('a'))
  store.dispatch(categoryToggled('Technology'))
  store.dispatch(orderToggled())
  return selectVisiblePosts(store.getState()).map((post) => post.title)
}

it('D10 applies the search, the filter and the order together, in that order, through selectVisiblePosts', async () => {
  const posts = parsePosts(rawPosts)

  // The snapshot has a single Technology post, and it matches "a".
  expect(await visibleTitles(posts)).toEqual(['Tech Innovations in Healthcare'])

  // With three Technology posts that all match "a" and share one date, the
  // filtered result comes out in the inverse of the API order.
  const technology = { id: 'technology', name: 'Technology' }
  const threeTechnologyPosts = posts.map((post) =>
    post.apiIndex < 3 ? { ...post, categories: [technology] } : post,
  )
  expect(await visibleTitles(threeTechnologyPosts)).toEqual([
    'Fitness Routines for Athletes',
    'Climate Change and Its Effects',
    'Tech Innovations in Healthcare',
  ])
})
