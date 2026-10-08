import { expect, it } from 'vitest'
import { parsePosts } from '../api/parsePosts'
import rawPosts from '../test/fixtures/posts.json'
import { makePost } from '../test/makePost'
import { buildFeed } from './buildFeed'

const ATOM = 'http://www.w3.org/2005/Atom'
const SITE = 'https://blog.example.com'
const UPDATED = '2026-10-07T12:00:00.000Z'
const posts = parsePosts(rawPosts)

function parse(xml: string): Document {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  expect(doc.querySelector('parsererror')?.textContent ?? '', 'the feed is well-formed XML').toBe('')
  return doc
}

const children = (parent: Element, name: string) =>
  Array.from(parent.children).filter((child) => child.localName === name && child.namespaceURI === ATOM)

const entriesOf = (doc: Document) => children(doc.documentElement, 'entry')

const alternateOf = (entry: Element) =>
  children(entry, 'link').find((link) => link.getAttribute('rel') === 'alternate')

it('A4 the feed is Atom 1.0 with a feed id, title and updated, and one entry per post', () => {
  const doc = parse(buildFeed({ posts, locale: 'en', siteUrl: SITE, updated: UPDATED }))
  const feed = doc.documentElement

  expect(feed.localName).toBe('feed')
  expect(feed.namespaceURI).toBe(ATOM)
  for (const name of ['id', 'title', 'updated']) {
    const found = children(feed, name)
    expect(found, `feed ${name}`).toHaveLength(1)
    expect(found[0].textContent, `feed ${name} has text`).not.toBe('')
  }
  expect(children(feed, 'updated')[0].textContent).toBe(UPDATED)
  expect(entriesOf(doc)).toHaveLength(26)
})

it('A4 every entry has an id, a title, an updated date, an alternate link and a summary', () => {
  const doc = parse(buildFeed({ posts, locale: 'es', siteUrl: SITE, updated: UPDATED }))
  const entries = entriesOf(doc)
  expect(entries).toHaveLength(26)

  const ids = new Set<string>()
  entries.forEach((entry, index) => {
    const post = posts[index]
    for (const name of ['id', 'title', 'updated', 'summary']) {
      const found = children(entry, name)
      expect(found, `entry ${index} ${name}`).toHaveLength(1)
      expect(found[0].textContent, `entry ${index} ${name} has text`).not.toBe('')
    }
    expect(children(entry, 'title')[0].textContent).toBe(post.title)
    expect(Date.parse(children(entry, 'updated')[0].textContent ?? '')).toBe(Date.parse(post.createdAt))
    expect(alternateOf(entry), `entry ${index} alternate link`).toBeDefined()
    ids.add(children(entry, 'id')[0].textContent ?? '')
  })
  expect(ids.size, 'the entry ids are all different').toBe(26)
})

it('A4 the ampersand, the angle brackets and the quotes of a title and a summary are escaped', () => {
  const title = `Tom & Jerry <b>"loud"</b> it's here`
  const post = makePost({
    id: 'escape-1',
    apiIndex: 0,
    title,
    content: 'First a < b & c > d "quoted" text.\n\nSecond paragraph.',
  })
  const xml = buildFeed({ posts: [post], locale: 'en', siteUrl: SITE, updated: UPDATED })

  // Read back by a parser, the text is the original one.
  const entry = entriesOf(parse(xml))[0]
  expect(children(entry, 'title')[0].textContent).toBe(title)
  expect(children(entry, 'summary')[0].textContent).toContain('a < b & c > d "quoted" text')

  // And in the raw text nothing of it is markup.
  expect(xml).toContain('Tom &amp; Jerry')
  expect(xml).toContain('&lt;b&gt;')
  expect(xml).not.toContain('Tom & Jerry')
  expect(xml).not.toContain('<b>')
  expect(xml).not.toContain('"loud"')
  expect(xml).not.toContain("it's")
})

it('A7 the link of every entry is absolute and starts with the siteUrl', () => {
  const doc = parse(buildFeed({ posts, locale: 'en', siteUrl: SITE, updated: UPDATED }))

  entriesOf(doc).forEach((entry, index) => {
    const href = alternateOf(entry)?.getAttribute('href') ?? ''
    expect(href, `entry ${index} link`).toBe(`${SITE}/posts/${posts[index].id}`)
  })
})

it('A7 a siteUrl with a trailing slash does not double the slash', () => {
  const doc = parse(buildFeed({ posts, locale: 'en', siteUrl: `${SITE}/`, updated: UPDATED }))

  for (const entry of entriesOf(doc)) {
    const href = alternateOf(entry)?.getAttribute('href') ?? ''
    expect(href.startsWith(`${SITE}/posts/`), href).toBe(true)
    expect(href.slice('https://'.length)).not.toContain('//')
  }
})
