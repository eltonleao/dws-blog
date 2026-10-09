import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { Post } from '../features/posts/types'
import { parsePosts } from './parsePosts'
import { withWrittenText } from '../content/writtenText'

const API_URL = 'https://tech-test-backend.dwsbrazil.io'
const API_TIMEOUT_MS = 10_000

/**
 * What `makeStore` gives the thunk middleware, which RTK Query hands to every
 * `queryFn` as `api.extra`: the way a store shortens the timeout of its own requests.
 */
export interface PostsApiExtra {
  apiTimeoutMs?: number
}

export const postsApi = createApi({
  reducerPath: 'postsApi',
  baseQuery: withWrittenText(fetchBaseQuery({ baseUrl: API_URL, timeout: API_TIMEOUT_MS })),
  endpoints: (build) => ({
    // One request for the 26 posts. The authors and categories endpoints go
    // unused: the filter options come from the posts.
    getPosts: build.query<Post[], void>({
      queryFn: async (_arg, api, _extraOptions, baseQuery) => {
        const { apiTimeoutMs } = (api.extra ?? {}) as PostsApiExtra
        const result = await baseQuery({ url: '/posts/', timeout: apiTimeoutMs })
        if (result.error) return { error: result.error }
        // A body of the wrong shape is an error to show, not an exception to throw.
        try {
          return { data: parsePosts(result.data) }
        } catch (error) {
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: error instanceof Error ? error.message : String(error),
            },
          }
        }
      },
    }),
  }),
})

export const { useGetPostsQuery } = postsApi
