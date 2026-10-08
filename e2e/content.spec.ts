import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'
import { expect, test, VIEWPORTS } from './fixtures'

// Each language is a chunk of its own. The chunk is found by what it carries:
// a run of plain letters from the first paragraph of the first post, read from
// the real file of each language (the chunk of the other language never has it).
const SLUG = 'tech-innovations-in-healthcare'

function marker(locale: 'en' | 'es'): string {
  const raw = readFileSync(fileURLToPath(new URL(`../src/content/posts/${SLUG}.${locale}.md`, import.meta.url)), 'utf8')
  const body = raw.split(/\r?\n/).slice(4).join('\n')
  const run = /[A-Za-z][A-Za-z ,.]{23,}/.exec(body)
  if (!run) throw new Error(`no plain run of letters in the ${locale} file`)
  return run[0].slice(0, 24)
}

/** Records the body of every script the page downloads. */
function watchScripts(page: Page) {
  const bodies: Promise<{ url: string; text: string }>[] = []
  page.on('response', (response) => {
    const url = new URL(response.url())
    if (url.hostname !== 'localhost' || !url.pathname.endsWith('.js')) return
    bodies.push(response.text().then((text) => ({ url: response.url(), text })))
  })
  return async (needle: string) => (await Promise.all(bodies)).filter((script) => script.text.includes(needle)).length
}

test('K6 asks for the chunk of English on a first visit and not the one of Spanish, and asks for Spanish once when it is chosen', async ({
  page,
  posts,
}) => {
  const english = marker('en')
  const spanish = marker('es')
  expect(english).not.toBe(spanish)
  const countOf = watchScripts(page)

  await page.setViewportSize(VIEWPORTS.desktop)
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page.locator('main a[href^="/posts/"]')).toHaveCount(posts.length)

  expect(await countOf(english), 'scripts with the English text').toBe(1)
  expect(await countOf(spanish), 'scripts with the Spanish text on a first visit').toBe(0)

  await page.getByRole('button', { name: 'Español', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await expect.poll(() => countOf(spanish), { message: 'scripts with the Spanish text after choosing it' }).toBe(1)

  // Back and forth: the chunks are in memory, nothing is downloaded again.
  await page.getByRole('button', { name: 'English', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await page.getByRole('button', { name: 'Español', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await page.waitForLoadState('networkidle')

  expect(await countOf(spanish), 'scripts with the Spanish text after going back and forth').toBe(1)
  expect(await countOf(english), 'scripts with the English text after going back and forth').toBe(1)
})

test('K6 asks for the chunk of Spanish and not the one of English when Spanish is stored', async ({ page, posts }) => {
  const english = marker('en')
  const spanish = marker('es')
  const countOf = watchScripts(page)
  await page.addInitScript(() => localStorage.setItem('dws-blog:locale', 'es'))

  await page.setViewportSize(VIEWPORTS.mobile)
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page.locator('main a[href^="/posts/"]')).toHaveCount(posts.length)

  expect(await countOf(spanish), 'scripts with the Spanish text').toBe(1)
  expect(await countOf(english), 'scripts with the English text').toBe(0)
})
