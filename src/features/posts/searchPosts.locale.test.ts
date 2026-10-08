import { expect, it } from 'vitest'
import { LOCALES } from '../../i18n/locale'
import type { Locale } from '../../i18n/locale'
import { makePost } from '../../test/makePost'
import { searchPosts } from './searchPosts'

// The posts as the reader sees them in each language: the title already
// localized, with the accents of the language. A query without accents has to
// find them, and a query with them has to find the title without.
const SEEN: Record<Locale, { title: string; plain: string; accented: string }> = {
  en: { title: 'Technology in the Creative Industries', plain: 'creative', accented: 'créative' },
  es: { title: 'Tecnología en las industrias creativas', plain: 'tecnologia', accented: 'tecnología' },
}

it('L9 finds the post by the title the reader sees, with or without accents, in every language', () => {
  expect(LOCALES.length).toBeGreaterThan(0)
  for (const locale of LOCALES) {
    const { title, plain, accented } = SEEN[locale]
    const posts = [
      makePost({ id: 'seen', apiIndex: 0, title }),
      makePost({ id: 'other', apiIndex: 1, title: 'Fitness Routines for Athletes' }),
    ]

    expect(searchPosts(posts, plain).map((post) => post.id), `${locale}: ${plain}`).toEqual(['seen'])
    expect(searchPosts(posts, accented).map((post) => post.id), `${locale}: ${accented}`).toEqual(['seen'])
    expect(searchPosts(posts, title.toUpperCase()).map((post) => post.id), `${locale}: upper case`).toEqual(['seen'])
  }
})

it('L9 does not find a Spanish post by a word that is not in its title, author or category', () => {
  const posts = [makePost({ id: 'seen', apiIndex: 0, title: SEEN.es.title })]
  expect(searchPosts(posts, 'ciencia')).toEqual([])
})
