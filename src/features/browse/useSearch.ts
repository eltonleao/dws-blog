import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAppDispatch, useAppSelector, useAppStore } from '../../app/hooks'
import { listScrollSaved, searchChanged } from './browseSlice'
import { searchFromBrowse } from './browseUrl'

/**
 * The search of the browse state, and the change every search control makes.
 * On the list, every key filters it. On any other page, the first change takes
 * the reader to the list with the term, in a new history entry, so Back
 * returns to that page; from there the list writes the URL, replacing it.
 */
export function useSearch(): [string, (search: string) => void] {
  const search = useAppSelector((state) => state.browse.search)
  const store = useAppStore()
  const dispatch = useAppDispatch()
  const location = useLocation()
  const navigate = useNavigate()
  // The router renders the list in a transition, so the keys typed before it
  // arrives still see the page they left. This holds the key of that page,
  // and those keys only filter; once the page changes, it is let go.
  const [leftFrom, setLeftFrom] = useState<string | null>(null)
  if (leftFrom !== null && leftFrom !== location.key) setLeftFrom(null)

  const change = (value: string) => {
    dispatch(searchChanged(value))
    if (location.pathname === '/' || leftFrom === location.key) return
    setLeftFrom(location.key)
    // A new search is a new list: it opens at the top, with the field in
    // view, not where the reader left it for a post.
    dispatch(listScrollSaved(0))
    navigate({ pathname: '/', search: searchFromBrowse(store.getState().browse) })
  }

  return [search, change]
}
