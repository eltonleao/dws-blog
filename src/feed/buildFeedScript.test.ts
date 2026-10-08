import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { main } from '../../scripts/build-feed.ts'
import { POSTS_URL, server } from '../test/server'

// `main({ outDir })` is the whole of scripts/build-feed.ts: it fetches the
// posts, localizes them with the files of src/content/posts, and writes
// feed.en.xml and feed.es.xml into outDir. On a failure it reports on stderr,
// sets process.exitCode to 1 and writes nothing. It does not run on import.

const ATOM = 'http://www.w3.org/2005/Atom'
let outDir = ''
let stderr: string[] = []

beforeEach(() => {
  outDir = mkdtempSync(join(tmpdir(), 'dws-feed-'))
  stderr = []
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    stderr.push(args.join(' '))
  })
  vi.spyOn(process.stderr, 'write').mockImplementation((chunk: string | Uint8Array) => {
    stderr.push(String(chunk))
    return true
  })
  vi.stubEnv('SITE_URL', '')
  vi.stubEnv('VERCEL_BRANCH_URL', '')
})

afterEach(() => {
  process.exitCode = undefined
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  rmSync(outDir, { recursive: true, force: true })
})

function entriesOf(file: string): Element[] {
  const doc = new DOMParser().parseFromString(readFileSync(join(outDir, file), 'utf8'), 'application/xml')
  expect(doc.querySelector('parsererror')?.textContent ?? '', `${file} is well-formed XML`).toBe('')
  return Array.from(doc.documentElement.getElementsByTagNameNS(ATOM, 'entry'))
}

const textOf = (entry: Element, name: string) => entry.getElementsByTagNameNS(ATOM, name)[0]?.textContent ?? ''

const linkOf = (entry: Element) =>
  Array.from(entry.getElementsByTagNameNS(ATOM, 'link'))
    .find((link) => link.getAttribute('rel') === 'alternate')
    ?.getAttribute('href') ?? ''

async function expectFailureWithoutFiles() {
  await main({ outDir })
  expect(process.exitCode, 'exit code').toBe(1)
  expect(stderr.join('\n').trim(), 'a message on stderr').not.toBe('')
  expect(readdirSync(outDir), 'nothing is left in the output folder').toEqual([])
}

it('A5 the build exits 1 with a message and leaves no feed when the API answers with an error', async () => {
  server.use(http.get(POSTS_URL, () => new HttpResponse('boom', { status: 500 })))
  await expectFailureWithoutFiles()
})

it('A5 the build exits 1 with a message and leaves no feed when the API cannot be reached', async () => {
  server.use(http.get(POSTS_URL, () => HttpResponse.error()))
  await expectFailureWithoutFiles()
})

it('A5 the build exits 1 with a message and leaves no feed when the answer is not a list', async () => {
  server.use(http.get(POSTS_URL, () => HttpResponse.json({ posts: [] })))
  await expectFailureWithoutFiles()
})

it('A5 the build exits 1 with a message and leaves no feed when the list is empty', async () => {
  server.use(http.get(POSTS_URL, () => HttpResponse.json([])))
  await expectFailureWithoutFiles()
})

it('A5 the build writes feed.en.xml and feed.es.xml with the 26 posts, each in its language, and exits 0', async () => {
  await main({ outDir })

  expect(process.exitCode ?? 0, 'exit code').toBe(0)
  expect(readdirSync(outDir).sort()).toEqual(['feed.en.xml', 'feed.es.xml'])
  const english = entriesOf('feed.en.xml')
  const spanish = entriesOf('feed.es.xml')
  expect(english).toHaveLength(26)
  expect(spanish).toHaveLength(26)
  expect(textOf(spanish[0], 'title'), 'the Spanish feed carries the Spanish title').not.toBe(textOf(english[0], 'title'))
  expect(textOf(spanish[0], 'summary'), 'the Spanish feed carries the Spanish text').not.toBe(textOf(english[0], 'summary'))
})

it('A7 the site url of the links is SITE_URL first, then the Vercel branch url, then localhost:4173', async () => {
  await main({ outDir })
  expect(linkOf(entriesOf('feed.en.xml')[0])).toMatch(/^http:\/\/localhost:4173\/posts\/./)

  vi.stubEnv('VERCEL_BRANCH_URL', 'dws-blog-git-explorer.example.vercel.app')
  await main({ outDir })
  const branch = linkOf(entriesOf('feed.en.xml')[0])
  expect(branch).toMatch(/^https?:\/\/dws-blog-git-explorer\.example\.vercel\.app\/posts\/./)

  vi.stubEnv('SITE_URL', 'https://blog.example.com')
  await main({ outDir })
  for (const file of ['feed.en.xml', 'feed.es.xml']) {
    for (const entry of entriesOf(file)) expect(linkOf(entry)).toMatch(/^https:\/\/blog\.example\.com\/posts\/./)
  }
})
