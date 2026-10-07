import { expect, it } from 'vitest'
import { parsePosts } from '../../api/parsePosts'
import rawPosts from '../../test/fixtures/posts.json'
import { makePost } from '../../test/makePost'
import { filterOptions } from './filterOptions'

const authorIdByName = new Map(
  rawPosts.map((post) => [post.author.name, post.author.id]),
)

it('D15 derives 6 categories and 4 authors from the posts, alphabetical and without repetition', () => {
  const { categories, authors } = filterOptions(parsePosts(rawPosts))

  expect(categories).toEqual(
    ['Fashion', 'Food', 'Science', 'Sports', 'Technology', 'Travel'].map(
      (name) => ({ value: name, label: name }),
    ),
  )
  expect(authors).toEqual(
    ['Emily Davis', 'Grace Doe', 'Jack Smith', 'Michael Johnson'].map(
      (name) => ({ value: authorIdByName.get(name), label: name }),
    ),
  )

  // Two posts with the same category (each one has its own category id in the
  // API) give a single option.
  const twoTechnologyPosts = [
    makePost({ id: 'one', apiIndex: 0, categories: [{ id: 'category-1', name: 'Technology' }] }),
    makePost({ id: 'two', apiIndex: 1, categories: [{ id: 'category-2', name: 'Technology' }] }),
  ]
  expect(filterOptions(twoTechnologyPosts).categories).toEqual([
    { value: 'Technology', label: 'Technology' },
  ])
})
