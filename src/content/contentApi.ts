import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
import type { Locale } from '../i18n/locale'
import { contentLoaders } from './loadContent'
import type { ContentMap } from './parseContent'

/** Why the text of a language did not arrive: its chunk failed to load. */
export interface ContentError {
  status: 'CUSTOM_ERROR'
  error: string
}

export const contentApi = createApi({
  reducerPath: 'contentApi',
  baseQuery: fakeBaseQuery<ContentError>(),
  // The text is part of the build: a language loaded once is good until the
  // page closes. A failed one is asked for again by the next subscription.
  keepUnusedDataFor: Infinity,
  endpoints: (build) => ({
    getContent: build.query<ContentMap, Locale>({
      queryFn: async (locale) => {
        // Read at the time of the request, not when this module loads.
        try {
          return { data: await contentLoaders[locale]() }
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

export const { useGetContentQuery } = contentApi
