import { mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parsePosts } from '../src/api/parsePosts.ts'
import { localizePost } from '../src/content/localizePost.ts'
import { parseContent } from '../src/content/parseContent.ts'
import { buildFeed } from '../src/feed/buildFeed.ts'
import { LOCALES } from '../src/i18n/locale.ts'
import type { Locale } from '../src/i18n/locale.ts'

const API_URL = 'https://tech-test-backend.dwsbrazil.io'
const FETCH_TIMEOUT_MS = 15_000
const POSTS_DIR = join(process.cwd(), 'src/content/posts')

function siteUrl(): string {
  const url = process.env.SITE_URL || process.env.VERCEL_BRANCH_URL || 'http://localhost:4173'
  // The Vercel host comes without a scheme.
  return /^https?:\/\//.test(url) ? url : `https://${url}`
}

function readContent(locale: Locale) {
  const files: Record<string, string> = {}
  for (const name of readdirSync(POSTS_DIR).sort()) {
    if (name.endsWith(`.${locale}.md`)) files[name] = readFileSync(join(POSTS_DIR, name), 'utf8')
  }
  return parseContent(files)
}

/**
 * Writes feed.en.xml and feed.es.xml into outDir (dist by default). Any
 * failure is reported on stderr with exit code 1, and no file is written: a
 * build never ships half a feed.
 */
export async function main({ outDir = 'dist' }: { outDir?: string } = {}): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/posts/`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!response.ok) throw new Error(`the posts API answered ${response.status}`)
    const posts = parsePosts(await response.json())
    if (posts.length === 0) throw new Error('the posts API answered an empty list')

    const updated = new Date().toISOString()
    const base = siteUrl()
    const feeds = LOCALES.map((locale) => {
      const content = readContent(locale)
      const localized = posts.map((post) => localizePost(post, content))
      return [`feed.${locale}.xml`, buildFeed({ posts: localized, locale, siteUrl: base, updated })] as const
    })

    mkdirSync(outDir, { recursive: true })
    for (const [name, xml] of feeds) writeFileSync(join(outDir, `${name}.tmp`), xml)
    for (const [name] of feeds) renameSync(join(outDir, `${name}.tmp`), join(outDir, name))
    console.log(`feed: ${feeds.length} files, ${posts.length} posts each`)
  } catch (error) {
    console.error(`build-feed: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}

// Runs as a script, not when a test imports it.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
