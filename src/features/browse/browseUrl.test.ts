import { expect, it } from 'vitest'
import rawPosts from '../../test/fixtures/posts.json'
import { browseFromSearch, searchFromBrowse } from './browseUrl'

const INITIAL = {
  search: '',
  categories: [] as string[],
  authors: [] as string[],
  order: 'newest' as 'newest' | 'oldest',
  listScrollY: 0,
}

const emilyId = rawPosts[0].author.id

it('D17 reads search, categories, author and order from the query string, and anything else gives the initial state', () => {
  const state = browseFromSearch(
    `?q=emily&category=Technology&category=Science&author=${emilyId}&order=oldest`,
  )
  expect(state).toMatchObject({
    search: 'emily',
    categories: ['Technology', 'Science'],
    authors: [emilyId],
    order: 'oldest',
  })

  for (const search of ['', '?order=foo', '?x=1']) {
    expect(() => browseFromSearch(search)).not.toThrow()
    expect(browseFromSearch(search)).toEqual(INITIAL)
  }
})

it('D18 writes an empty string for the initial state, and a state with a search, categories, an author and oldest survives the round trip without listScrollY', () => {
  expect(searchFromBrowse(INITIAL)).toBe('')

  const state = {
    search: 'emily',
    categories: ['Arts & Culture', 'Science'],
    authors: [emilyId],
    order: 'oldest' as const,
    listScrollY: 480,
  }
  const search = searchFromBrowse(state)

  expect(browseFromSearch(search)).toEqual({ ...state, listScrollY: 0 })
  expect(searchFromBrowse({ ...state, order: 'newest' })).not.toContain('newest')
})
