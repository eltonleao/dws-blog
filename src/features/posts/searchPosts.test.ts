import { expect, it } from 'vitest'
import { parsePosts } from '../../api/parsePosts'
import rawPosts from '../../test/fixtures/posts.json'
import { searchPosts } from './searchPosts'
import type { Post } from './types'

const posts = parsePosts(rawPosts)
const titles = (list: Post[]) => list.map((post) => post.title)

it('D8 searches title, author and category without case and without accents', () => {
  for (const query of ['tech', 'TECH', 'téch']) {
    expect(titles(searchPosts(posts, query))).toContain('Tech Innovations in Healthcare')
  }

  const byEmily = searchPosts(posts, 'emily')
  expect(byEmily).toHaveLength(6)
  expect(byEmily.every((post) => post.author.name === 'Emily Davis')).toBe(true)

  // "Dressing Up for Winter" is the only Fashion post and has no "fashion" in
  // its title: only the category name can find it.
  expect(titles(searchPosts(posts, 'fashion'))).toContain('Dressing Up for Winter')
})

it('D9 does not search the content, and a query of only spaces returns every post', () => {
  // The premise: "lorem" is in the content of every post.
  expect(rawPosts.every((post) => post.content.toLowerCase().includes('lorem'))).toBe(true)

  expect(searchPosts(posts, 'lorem')).toEqual([])
  expect(searchPosts(posts, '   ')).toHaveLength(26)
})
