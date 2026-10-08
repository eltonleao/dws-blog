import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { postsApi } from '../api/postsApi'
import type { PostsApiExtra } from '../api/postsApi'
import { commentsApi } from '../comments/commentsApi'
import { contentApi } from '../content/contentApi'
import { browseReducer } from '../features/browse/browseSlice'
import { browseFromSearch } from '../features/browse/browseUrl'
import type { Locale } from '../i18n/locale'
import { localeReducer } from '../i18n/localeSlice'

const rootReducer = combineReducers({
  [postsApi.reducerPath]: postsApi.reducer,
  [contentApi.reducerPath]: contentApi.reducer,
  [commentsApi.reducerPath]: commentsApi.reducer,
  browse: browseReducer,
  locale: localeReducer,
})

export interface StoreOptions {
  /** Shortens the timeout of the posts request, for the test of a slow API. */
  apiTimeoutMs?: number
  /** The query string the page was opened with: it fills the browse state, once, here. */
  search?: string
  /** The language it starts in: main.tsx gives the stored one, for the first paint. */
  locale?: Locale
}

/** One store per call: the app makes one, and each test makes its own. */
export function makeStore({ apiTimeoutMs, search = '', locale = 'en' }: StoreOptions = {}) {
  const extra: PostsApiExtra = { apiTimeoutMs }
  return configureStore({
    reducer: rootReducer,
    preloadedState: { browse: browseFromSearch(search), locale: { locale } },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ thunk: { extraArgument: extra } }).concat(
        postsApi.middleware,
        contentApi.middleware,
        commentsApi.middleware,
      ),
  })
}

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<typeof rootReducer>
export type AppDispatch = AppStore['dispatch']
