import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page } from '@playwright/test'
import { expect, test, VIEWPORTS } from './fixtures'
import { expectNear } from './support'

const KEY = 'dws-blog:locale'
const FIRST_POST = 'cc8a8c63-2f82-4745-8b6e-28f88ff73fdd'

// What the interface said in English before the language existed. None of it
// may be painted when the page opens in Spanish.
const ENGLISH_TEXTS = [
  'Loading posts',
  'Newest first',
  'Oldest first',
  'Clear filters',
  'Apply filters',
  'Filters',
  'Category',
  'Author',
]

const html = (page: Page) => page.locator('html')
const english = (page: Page) => page.getByRole('button', { name: 'English', exact: true })
const spanish = (page: Page) => page.getByRole('button', { name: 'Español', exact: true })

// The cards of the list: the links to a post. It does not read the titles, so
// it holds in both languages.
const cards = (page: Page) => page.locator('main a[href^="/posts/"]')

async function openListAt(page: Page, path: string, viewport: { width: number; height: number }, count?: number) {
  await page.setViewportSize(viewport)
  await page.goto(path)
  if (count === undefined) await expect(cards(page).first(), `the cards at ${viewport.width}px`).toBeVisible()
  else await expect(cards(page), `the cards at ${viewport.width}px`).toHaveCount(count)
}

async function blockingViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  return violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .flatMap((violation) =>
      violation.nodes.map((node) => ({
        rule: violation.id,
        impact: violation.impact,
        selector: node.target.join(' '),
      })),
    )
}

test('L3 switches the interface to Spanish, writes html lang, stores the choice and keeps it after a reload', async ({
  page,
  posts,
}) => {
  await openListAt(page, '/', VIEWPORTS.desktop, posts.length)
  await expect(html(page)).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('button', { name: 'Technology', exact: true })).toBeVisible()

  await spanish(page).click()

  await expect(html(page)).toHaveAttribute('lang', 'es')
  await expect(page.getByRole('button', { name: 'Tecnología', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Technology', exact: true })).toHaveCount(0)
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe('es')

  await page.reload()

  await expect(html(page), 'html lang after the reload').toHaveAttribute('lang', 'es')
  await expect(page.getByRole('button', { name: 'Tecnología', exact: true }), 'the label after the reload').toBeVisible()
  await expect(spanish(page)).toHaveAttribute('aria-pressed', 'true')
})

test('L4 opens in English on a first visit, and in Spanish from the first paint when Spanish is stored', async ({
  page,
  posts,
}) => {
  await openListAt(page, '/', VIEWPORTS.desktop, posts.length)
  await expect(html(page), 'first visit').toHaveAttribute('lang', 'en')
  await expect(english(page)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Newest first', exact: true })).toBeVisible()
})

test('L4 paints no English text when Spanish is stored before the page opens', async ({ page, posts }) => {
  // Before any script of the page: store Spanish and record every text that
  // ever enters the document, so a flash of English cannot hide.
  await page.addInitScript(
    ([key]) => {
      localStorage.setItem(key, 'es')
      const painted = new Set<string>()
      ;(window as unknown as { __painted: Set<string> }).__painted = painted
      const record = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = (node.textContent ?? '').trim()
          if (text) painted.add(text)
        } else {
          node.childNodes.forEach(record)
        }
      }
      new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          mutation.addedNodes.forEach(record)
          if (mutation.type === 'characterData') record(mutation.target)
        }
      }).observe(document, { childList: true, subtree: true, characterData: true })
    },
    [KEY],
  )

  await openListAt(page, '/', VIEWPORTS.desktop, posts.length)

  await expect(html(page)).toHaveAttribute('lang', 'es')
  await expect(spanish(page)).toHaveAttribute('aria-pressed', 'true')
  const painted = await page.evaluate(() => [...(window as unknown as { __painted: Set<string> }).__painted])
  expect(painted.length, 'the recorder saw the page being painted').toBeGreaterThan(0)
  expect(
    ENGLISH_TEXTS.filter((text) => painted.includes(text)),
    'English texts that were painted',
  ).toEqual([])
})

test('L7 filters the same posts with ?category=Technology in English and in Spanish, and keeps the state when the language changes', async ({
  page,
  posts,
}) => {
  const expected = posts
    .filter((post) => post.categories.some((category) => category.name === 'Technology'))
    .map((post) => `/posts/${post.id}`)
    .sort()
  expect(expected.length, 'the snapshot has Technology posts').toBeGreaterThan(0)
  const hrefs = async () =>
    (await cards(page).evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''))).sort()

  await openListAt(page, '/?category=Technology', VIEWPORTS.desktop, expected.length)
  expect(await hrefs(), 'English').toEqual(expected)
  await expect(page.getByRole('button', { name: 'Technology', exact: true })).toHaveAttribute('aria-pressed', 'true')

  await spanish(page).click()

  await expect(page.getByRole('button', { name: 'Tecnología', exact: true }), 'translated label').toHaveAttribute(
    'aria-pressed',
    'true',
  )
  expect(await hrefs(), 'Spanish').toEqual(expected)
  expect(new URL(page.url()).search, 'the address keeps the value of the API').toBe('?category=Technology')

  // The search, the filter and the order survive the change, in the address and on screen.
  await openListAt(page, '/?q=tech&category=Technology&order=oldest', VIEWPORTS.desktop)
  const before = page.url()
  await english(page).click()
  await spanish(page).click()
  expect(page.url(), 'the address after the change').toBe(before)
  await expect(page.getByRole('searchbox')).toHaveValue('tech')
  await expect(page.getByRole('button', { name: 'Tecnología', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

test('L10 has no serious or critical axe violation with the switch, in English and in Spanish, at 375 and 1440', async ({
  page,
  posts,
}) => {
  test.slow()

  for (const size of ['mobile', 'desktop'] as const) {
    await openListAt(page, '/', VIEWPORTS[size], posts.length)
    await expect(english(page), `${size}: the switch is in the header`).toBeVisible()
    expect(await blockingViolations(page), `${size}: axe in English`).toEqual([])

    await spanish(page).click()
    await expect(html(page)).toHaveAttribute('lang', 'es')
    expect(await blockingViolations(page), `${size}: axe in Spanish`).toEqual([])

    await english(page).click()
  }
})

test('L10 changes the language with Enter and Space, and the focus stays on the button', async ({ page, posts }) => {
  await openListAt(page, '/', VIEWPORTS.desktop, posts.length)

  await spanish(page).focus()
  await page.keyboard.press('Enter')
  await expect(spanish(page)).toHaveAttribute('aria-pressed', 'true')
  await expect(spanish(page), 'focus after Enter').toBeFocused()

  await english(page).focus()
  await page.keyboard.press('Space')
  await expect(english(page)).toHaveAttribute('aria-pressed', 'true')
  await expect(english(page), 'focus after Space').toBeFocused()
})

test('L10 keeps the scroll position and the page when the language changes on a post', async ({ page }) => {
  await page.setViewportSize(VIEWPORTS.desktop)
  await page.goto(`/posts/${FIRST_POST}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.evaluate(() => {
    window.scrollTo(0, 400)
    ;(window as unknown as { __main: Element | null }).__main = document.querySelector('main')
  })
  const before = await page.evaluate(() => window.scrollY)
  expect(before, 'the post is long enough to scroll').toBeGreaterThan(100)

  // Focus without scrolling, then the keyboard: a click would scroll to the button.
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll('button')).find(
      (candidate) => candidate.getAttribute('aria-label') === 'Español' || candidate.textContent?.trim() === 'ES',
    )
    button?.focus({ preventScroll: true })
  })
  await page.keyboard.press('Enter')
  await expect(html(page)).toHaveAttribute('lang', 'es')

  expect(await page.evaluate(() => window.scrollY), 'scrollY after the change').toBe(before)
  expect(
    await page.evaluate(() => document.querySelector('main') === (window as unknown as { __main: Element | null }).__main),
    'the main element is the same one',
  ).toBe(true)
})

test('L11 fits the header with the switch from 320 to 1920 without a horizontal scroll, and the search stays where it is', async ({
  page,
  posts,
}) => {
  test.slow()

  for (const width of [320, 375, 768, 1440, 1920]) {
    await openListAt(page, '/', { width, height: 900 }, posts.length)
    const label = `${width}px`

    // The search is the field on desktop and the button that opens the panel
    // on mobile; neither has a name that holds in both languages, so they are
    // found by what they are.
    const search = width >= 1024 ? page.locator('header input[type="search"]') : page.locator('header button[aria-expanded]')
    await expect(english(page), `${label}: English button`).toBeVisible()
    await expect(spanish(page), `${label}: Español button`).toBeVisible()

    const measure = async () => {
      const box = async (locator: Locator, name: string) => {
        const found = await locator.boundingBox()
        if (!found) throw new Error(`${label}: ${name} has no box`)
        return found
      }
      return {
        search: await box(search, 'the search'),
        english: await box(english(page), 'English'),
        spanish: await box(spanish(page), 'Español'),
        header: await box(page.locator('header'), 'the header'),
        widths: await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          client: document.documentElement.clientWidth,
        })),
      }
    }

    const inEnglish = await measure()
    expect(inEnglish.widths.scroll, `${label}: scrollWidth over clientWidth`).toBeLessThanOrEqual(inEnglish.widths.client)
    for (const button of [inEnglish.english, inEnglish.spanish]) {
      expect(button.x, `${label}: the switch starts inside the viewport`).toBeGreaterThanOrEqual(0)
      expect(button.x + button.width, `${label}: the switch ends inside the viewport`).toBeLessThanOrEqual(width)
    }
    expectNear(inEnglish.spanish.y, inEnglish.english.y, `${label}: the two buttons are on one line`)

    await spanish(page).click()
    await expect(html(page)).toHaveAttribute('lang', 'es')
    const inSpanish = await measure()

    expect(inSpanish.widths.scroll, `${label}: scrollWidth in Spanish`).toBeLessThanOrEqual(inSpanish.widths.client)
    expectNear(inSpanish.search.x, inEnglish.search.x, `${label}: search x`)
    expectNear(inSpanish.search.y, inEnglish.search.y, `${label}: search y`)
    expectNear(inSpanish.search.width, inEnglish.search.width, `${label}: search width`)
    expectNear(inSpanish.header.height, inEnglish.header.height, `${label}: header height`)
    expectNear(inSpanish.english.x, inEnglish.english.x, `${label}: switch x`)
    expectNear(inSpanish.spanish.width, inEnglish.spanish.width, `${label}: switch button width`)
  }
})
