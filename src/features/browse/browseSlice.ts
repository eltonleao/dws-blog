import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { FilterSelection, SortOrder } from '../posts/types'

/**
 * What the list screen shares between its parts: the search, the filters and
 * the order, which the URL mirrors, and the scroll position, which it does not.
 */
export interface BrowseState {
  search: string
  /** Category names. */
  categories: string[]
  /** Author ids. */
  authors: string[]
  order: SortOrder
  /** Where the list was scrolled to when the reader left it for a post. */
  listScrollY: number
}

export const initialBrowseState: BrowseState = {
  search: '',
  categories: [],
  authors: [],
  order: 'newest',
  listScrollY: 0,
}

/** A copy of `values` with `value` added, or taken out when it was already there. */
function toggle(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value]
}

const browseSlice = createSlice({
  name: 'browse',
  initialState: initialBrowseState,
  reducers: {
    searchChanged(state, action: PayloadAction<string>) {
      state.search = action.payload
    },
    categoryToggled(state, action: PayloadAction<string>) {
      state.categories = toggle(state.categories, action.payload)
    },
    authorToggled(state, action: PayloadAction<string>) {
      state.authors = toggle(state.authors, action.payload)
    },
    /** Both lists at once: the sidebar draft is sent when Apply filters is pressed. */
    filtersApplied(state, action: PayloadAction<FilterSelection>) {
      state.categories = [...action.payload.categories]
      state.authors = [...action.payload.authors]
    },
    /** The search and both filter lists go back to empty; the order and the scroll stay. */
    filtersCleared(state) {
      state.search = initialBrowseState.search
      state.categories = []
      state.authors = []
    },
    orderToggled(state) {
      state.order = state.order === 'newest' ? 'oldest' : 'newest'
    },
    listScrollSaved(state, action: PayloadAction<number>) {
      state.listScrollY = action.payload
    },
  },
})

export const {
  searchChanged,
  categoryToggled,
  authorToggled,
  filtersApplied,
  filtersCleared,
  orderToggled,
  listScrollSaved,
} = browseSlice.actions

export const browseReducer = browseSlice.reducer
