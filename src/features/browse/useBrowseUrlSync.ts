import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAppSelector } from '../../app/hooks'
import { searchFromBrowse } from './browseUrl'

/**
 * Keeps the query string a mirror of the browse state. The URL enters the
 * store once, when the store is made; from then on the store writes the URL,
 * replacing the history entry, so typing does not stack one entry per key.
 * Only the list page calls it.
 */
export function useBrowseUrlSync(): void {
  // A string, so a change the URL does not carry (the scroll) renders nothing.
  const search = useAppSelector((state) => searchFromBrowse(state.browse))
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (search !== location.search) navigate({ search }, { replace: true })
  }, [search, location.search, navigate])
}
