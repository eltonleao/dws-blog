import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import rawPosts from './fixtures/posts.json'
import { en, es } from './dictionaries'
import { renderLocalized } from './renderLocalized'
import type { Locale } from '../i18n/locale'

// What the tests of the comments section share: the post they open, the
// dictionary keys of the section with the English text each one carries (the
// contract of dentsu-P4-comentarios), and the little the interaction needs.

export const POST = rawPosts[1]
export const OTHER_POST = rawPosts[0]
export const POST_PATH = `/posts/${POST.id}`

/** Key of the dictionary -> the English text it has to carry. */
export const CONTRACT: Record<string, string> = {
  'comments.title.one': '{count} comment',
  'comments.title.other': '{count} comments',
  'comments.loading': 'Loading comments',
  'comments.empty': 'No comments yet. Be the first.',
  'comments.unavailable': 'Comments are unavailable right now',
  'comments.visitorFailed': 'Could not start your visitor session',
  'comments.label': 'Your comment',
  'comments.submit': 'Post comment',
  'comments.leave': 'Leave',
  'comments.delete': 'Delete comment',
}

export const text = (locale: Locale) => (locale === 'es' ? es : en)

/** The title of the section for `count` comments, as the dictionary of `locale` says it. */
export function titleFor(locale: Locale, count: number): string {
  const rule = new Intl.PluralRules(locale).select(count)
  return text(locale)[`comments.title.${rule}`].replace('{count}', String(count))
}

export function renderPost(locale: Locale = 'en', path = POST_PATH) {
  return renderLocalized(path, { locale })
}

/** Waits for the section to be there and returns the field and the send button. */
export async function openForm(locale: Locale = 'en') {
  const t = text(locale)
  const field = await screen.findByRole('textbox', { name: t['comments.label'] })
  const send = screen.getByRole('button', { name: t['comments.submit'] })
  return { field, send, t }
}

export async function comment(body: string, locale: Locale = 'en') {
  const user = userEvent.setup()
  const { field, send } = await openForm(locale)
  await user.type(field, body)
  await user.click(send)
  return { user, field, send }
}
