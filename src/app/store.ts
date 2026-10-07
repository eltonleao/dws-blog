import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { postsApi } from '../api/postsApi'
import type { PostsApiExtra } from '../api/postsApi'
import { browseReducer } from '../features/browse/browseSlice'
import { browseFromSearch } from '../features/browse/browseUrl'

const rootReducer = combineReducers({
  [postsApi.reducerPath]: postsApi.reducer,
  browse: browseReducer,
})

export interface StoreOptions {
  /** Shortens the timeout of the posts request, for the test of a slow API. */
  apiTimeoutMs?: number
  /** The query string the page was opened with: it fills the browse state, once, here. */
  search?: string
}

/** One store per call: the app makes one, and each test makes its own. */
export function makeStore({ apiTimeoutMs, search = '' }: StoreOptions = {}) {
  const extra: PostsApiExtra = { apiTimeoutMs }
  return configureStore({
    reducer: rootReducer,
    preloadedState: { browse: browseFromSearch(search) },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ thunk: { extraArgument: extra } }).concat(
        postsApi.middleware,
      ),
  })
}

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<typeof rootReducer>
export type AppDispatch = AppStore['dispatch']
