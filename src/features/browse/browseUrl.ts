import { initialBrowseState } from './browseSlice'
import type { BrowseState } from './browseSlice'
import type { SortOrder } from '../posts/types'

function isSortOrder(value: string | null): value is SortOrder {
  return value === 'newest' || value === 'oldest'
}

/**
 * The browse state a query string describes: `q`, `category` (repeated, by
 * name), `author` (repeated, by id) and `order`. It is total and never throws:
 * a key it does not know is ignored, an `order` that is not newest or oldest
 * falls back to the default, and '' gives the initial state. `listScrollY`
 * is not in the URL, so it is always 0.
 */
export function browseFromSearch(search: string): BrowseState {
  const params = new URLSearchParams(search)
  const order = params.get('order')
  return {
    search: params.get('q') ?? initialBrowseState.search,
    categories: params.getAll('category'),
    authors: params.getAll('author'),
    order: isSortOrder(order) ? order : initialBrowseState.order,
    listScrollY: initialBrowseState.listScrollY,
  }
}

/**
 * The query string of a browse state, starting with `?`, or '' when there is
 * nothing to say. The default is left out: the initial state gives a clean
 * URL, and `order=newest` never appears.
 */
export function searchFromBrowse({
  search,
  categories,
  authors,
  order,
}: BrowseState): string {
  const params = new URLSearchParams()
  if (search !== initialBrowseState.search) params.set('q', search)
  for (const category of categories) params.append('category', category)
  for (const author of authors) params.append('author', author)
  if (order !== initialBrowseState.order) params.set('order', order)
  const query = params.toString()
  return query === '' ? '' : `?${query}`
}
