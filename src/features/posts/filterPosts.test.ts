import { expect, it } from 'vitest'
import { parsePosts } from '../../api/parsePosts'
import rawPosts from '../../test/fixtures/posts.json'
import { filterPosts } from './filterPosts'
import type { Post } from './types'

const posts = parsePosts(rawPosts)
const titles = (list: Post[]) => list.map((post) => post.title)

function authorId(name: string): string {
  const post = posts.find((candidate) => candidate.author.name === name)
  if (!post) throw new Error(`No post by ${name} in the fixture`)
  return post.author.id
}

it('D4 returns the posts of any selected category when two categories are selected', () => {
  const result = filterPosts(posts, {
    categories: ['Technology', 'Science'],
    authors: [],
  })

  expect(result).toHaveLength(2)
  expect(titles(result)).toEqual(
    expect.arrayContaining([
      'Tech Innovations in Healthcare',
      'Climate Change and Its Effects',
    ]),
  )
})

it('D5 requires the category and the author together', () => {
  const withEmily = filterPosts(posts, {
    categories: ['Technology'],
    authors: [authorId('Emily Davis')],
  })
  const withMichael = filterPosts(posts, {
    categories: ['Technology'],
    authors: [authorId('Michael Johnson')],
  })

  expect(titles(withEmily)).toEqual(['Tech Innovations in Healthcare'])
  expect(withMichael).toEqual([])
})

it('D6 does not filter without a selection, and an author alone also returns the posts without category', () => {
  expect(filterPosts(posts, { categories: [], authors: [] })).toHaveLength(26)

  const byMichael = filterPosts(posts, {
    categories: [],
    authors: [authorId('Michael Johnson')],
  })
  expect(byMichael).toHaveLength(6)
  expect(byMichael.every((post) => post.categories.length === 0)).toBe(true)
})

it('D7 drops the 20 posts without category once any category is selected, and a null categories does not throw', () => {
  const everyCategory = ['Technology', 'Science', 'Sports', 'Travel', 'Food', 'Fashion']
  const withAnyCategory = filterPosts(posts, { categories: everyCategory, authors: [] })
  expect(withAnyCategory).toHaveLength(26 - 20)
  expect(withAnyCategory.every((post) => post.categories.length > 0)).toBe(true)

  const technology = filterPosts(posts, { categories: ['Technology'], authors: [] })
  expect(technology.some((post) => post.categories.length === 0)).toBe(false)

  const withNullCategories = rawPosts.map((post, index) =>
    index === 0 ? { ...post, categories: null } : post,
  )
  expect(() => parsePosts(withNullCategories)).not.toThrow()
  const parsed = parsePosts(withNullCategories)
  expect(parsed[0].categories).toEqual([])
  expect(() =>
    filterPosts(parsed, { categories: ['Technology'], authors: [] }),
  ).not.toThrow()
  expect(filterPosts(parsed, { categories: ['Technology'], authors: [] })).toEqual([])
})
