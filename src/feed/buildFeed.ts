import type { Post } from '../features/posts/types.ts'
import type { Locale } from '../i18n/locale.ts'
import { toParagraphs } from '../lib/paragraphs.ts'

export interface BuildFeedOptions {
  /** The posts to list, already in the language of the feed, in the order they should appear. */
  posts: Post[]
  locale: Locale
  /** The address of the site, with or without a trailing slash. */
  siteUrl: string
  /** When the feed was built, as an ISO date. */
  updated: string
}

const TITLES: Record<Locale, string> = {
  en: 'DWS Blog',
  es: 'DWS Blog (español)',
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}

function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => ESCAPES[character])
}

/**
 * An Atom 1.0 feed of the posts: one entry each, linking to the post page.
 * The summary of an entry is the first paragraph of the post.
 */
export function buildFeed({ posts, locale, siteUrl, updated }: BuildFeedOptions): string {
  const base = siteUrl.replace(/\/+$/, '')
  const entries = posts.map((post) => {
    const url = `${base}/posts/${post.id}`
    const summary = toParagraphs(post.content)[0] ?? post.title
    return [
      '  <entry>',
      `    <id>${escapeXml(url)}</id>`,
      `    <title>${escapeXml(post.title)}</title>`,
      `    <updated>${escapeXml(post.createdAt)}</updated>`,
      `    <link rel="alternate" href="${escapeXml(url)}"/>`,
      `    <author><name>${escapeXml(post.author.name)}</name></author>`,
      `    <summary>${escapeXml(summary)}</summary>`,
      '  </entry>',
    ].join('\n')
  })

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    `<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${locale}">`,
    `  <id>${escapeXml(`${base}/feed.${locale}.xml`)}</id>`,
    `  <title>${escapeXml(TITLES[locale])}</title>`,
    `  <updated>${escapeXml(updated)}</updated>`,
    `  <link rel="alternate" href="${escapeXml(`${base}/`)}"/>`,
    `  <link rel="self" href="${escapeXml(`${base}/feed.${locale}.xml`)}"/>`,
    ...entries,
    '</feed>',
    '',
  ].join('\n')
}
