import { describe, expect, it } from 'vitest'
import { makePost } from '../test/makePost'
import type { ContentMap } from './parseContent'
import { localizePost } from './localizePost'

const post = makePost({
  id: 'id-a',
  apiIndex: 0,
  title: 'Title from the API',
  content: 'Lorem ipsum.\n\nDolor sit amet.',
  author: { id: 'author-9', name: 'Grace Doe', profilePicture: '' },
})

const content: ContentMap = {
  'id-a': { title: 'Written title', content: 'Real first paragraph.\n\nReal second paragraph.' },
}

describe('localizePost', () => {
  it('K4 takes the title and the content from the map and keeps every other field', () => {
    expect(localizePost(post, content)).toEqual({
      ...post,
      title: 'Written title',
      content: 'Real first paragraph.\n\nReal second paragraph.',
    })
  })

  it('K4 returns the post of the API when its id is not in the map', () => {
    expect(localizePost(makePost({ id: 'id-unknown', apiIndex: 1, title: 'New', content: 'Text.' }), content)).toEqual(
      makePost({ id: 'id-unknown', apiIndex: 1, title: 'New', content: 'Text.' }),
    )
  })

  it('K4 returns the post of the API while the content has not arrived', () => {
    expect(localizePost(post, undefined)).toEqual(post)
  })
})
