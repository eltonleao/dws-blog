import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page } from '@playwright/test'
import { expect, test, VIEWPORTS } from './fixtures'
import { cardLinks, openList } from './support'

// The tour of ?mode=tutorial: it rides on the app without driving it, so every
// step here is done the way a reader does it, and the tour only has to notice.

const TOUR_CHUNK = /\/assets\/Tutorial-[^/]*\.js$/

const tourCard = (page: Page): Locator => page.getByRole('complementary', { name: 'Tutorial' })

/** The value the card measures under `label`. */
const measured = (page: Page, label: string): Locator =>
  tourCard(page)
    .locator('dt')
    .filter({ hasText: new RegExp(`^${label}$`) })
    .locator('xpath=following-sibling::dd')

async function next(page: Page) {
  await tourCard(page).getByRole('button', { name: 'Next', exact: true }).click()
}

/** Where the ghost's origin, the tip of its pointer, is now. */
function ghostPoint(page: Page): Promise<{ x: number; y: number }> {
  return page.locator('[data-tour="ghost"]').evaluate((ghost) => {
    const matrix = new DOMMatrix(getComputedStyle(ghost).transform)
    return { x: Math.round(matrix.m41), y: Math.round(matrix.m42) }
  })
}

async function centerOf(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox()
  if (!box) throw new Error('the target has no box')
  return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) }
}

test('T12 without ?mode=tutorial there is no card, and the code of the tour is never downloaded', async ({
  page,
  posts,
}) => {
  const chunks: string[] = []
  page.on('request', (request) => {
    if (TOUR_CHUNK.test(request.url())) chunks.push(request.url())
  })

  await openList(page, posts, VIEWPORTS.desktop)
  await page.waitForLoadState('networkidle')

  await expect(tourCard(page)).toHaveCount(0)
  expect(chunks, 'requests for the chunk of the tour').toEqual([])

  // The control: with the parameter, the same listener sees the chunk.
  await openList(page, posts, VIEWPORTS.desktop, { path: '/?mode=tutorial' })
  await expect(tourCard(page)).toBeVisible()
  expect(chunks, 'requests for the chunk of the tour').toHaveLength(1)
})

test('T13 the tour starts from the parameter and outlives the list cleaning the URL', async ({
  page,
  posts,
}) => {
  await openList(page, posts, VIEWPORTS.desktop, { path: '/?mode=tutorial' })

  await expect(tourCard(page)).toBeVisible()
  await expect
    .poll(() => new URL(page.url()).searchParams.has('mode'), { message: 'mode left the URL' })
    .toBe(false)
  await expect(tourCard(page).getByText('Step 1 of 5')).toBeVisible()
})

test('T14 each of the five steps is explained by the reader doing it, and the closing card leads to the proof', async ({
  page,
  posts,
}) => {
  const links = await openList(page, posts, VIEWPORTS.desktop, { path: '/?mode=tutorial' })
  const card = tourCard(page)

  // 1. The search ignores case: the card shows what the comparison saw.
  await expect(card.getByRole('heading', { name: 'Does the search care about capital letters?' })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Search' }).fill('TECHNOLOGY')
  await expect(card.getByText(/^It does not\./)).toBeVisible()
  await expect(measured(page, 'Compared as')).toHaveText('technology')
  await expect(measured(page, 'Posts found')).toHaveText(String(await links.count()))
  await expect(card.getByRole('link', { name: 'src/lib/normalize.ts' })).toHaveAttribute(
    'href',
    'https://github.com/eltonleao/dws-blog/blob/master/src/lib/normalize.ts',
  )
  await next(page)

  // 2. The filters live in the URL: a reload keeps them.
  await expect(card.getByText('Step 2 of 5')).toBeVisible()
  await page.getByRole('button', { name: 'Technology', exact: true }).click()
  await page.getByRole('button', { name: 'Apply filters' }).click()
  await expect(card.getByText('Now reload the page.')).toBeVisible()
  await page.reload()
  await expect(card.getByText(/^In the URL\./)).toBeVisible()
  await expect(measured(page, 'Categories in the store')).toHaveText('Technology')
  await next(page)

  // 3. Sorting happens in the browser: the count of requests stays put.
  await expect(card.getByText('Step 3 of 5')).toBeVisible()
  const requestsBeforeSort = await measured(page, 'Requests to the API').textContent()
  await page.getByRole('button', { name: 'Newest first', exact: true }).click()
  await expect(card.getByText(/^No\. The 26 posts/)).toBeVisible()
  await expect(measured(page, 'Order')).toHaveText('Oldest first')
  await expect(measured(page, 'Requests to the API')).toHaveText(requestsBeforeSort ?? '')
  await next(page)

  // 4. The post comes from the cache: going there and back asks nothing.
  await expect(card.getByText('Step 4 of 5')).toBeVisible()
  const requestsBeforePost = await measured(page, 'Requests to the API').textContent()
  await cardLinks(page, posts).first().click()
  await expect(card.getByText('Now go back with Back.')).toBeVisible()
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(card.getByText(/^No\. The post page reads/)).toBeVisible()
  await expect(measured(page, 'Requests to the API')).toHaveText(requestsBeforePost ?? '')
  await next(page)

  // 5. One media query swaps the sidebar for the dropdowns.
  await expect(card.getByText('Step 5 of 5')).toBeVisible()
  await expect(measured(page, 'Layout')).toHaveText('Sidebar, from 1024 px')
  await page.setViewportSize(VIEWPORTS.mobile)
  await expect(card.getByText(/^One media query/)).toBeVisible()
  await expect(measured(page, 'Layout')).toHaveText('Dropdowns, under 1024 px')
  await expect(measured(page, 'Window')).toHaveText('375 px')
  await next(page)

  await expect(card.getByRole('heading', { name: 'That was the tour.' })).toBeVisible()
  await expect(card.getByRole('link', { name: 'See the proof page' })).toHaveAttribute('href', '/proof')
  await card.getByRole('button', { name: 'Close the tour' }).click()
  await expect(card).toHaveCount(0)
})

test('T15 Skip moves on without the action, and Exit forgets the tour for the next load', async ({
  page,
  posts,
}) => {
  await openList(page, posts, VIEWPORTS.desktop, { path: '/?mode=tutorial' })
  const card = tourCard(page)

  await card.getByRole('button', { name: 'Skip', exact: true }).click()
  await expect(card.getByText('Step 2 of 5')).toBeVisible()
  await expect(card.getByText(/^In the URL\./)).toHaveCount(0)

  await card.getByRole('button', { name: 'Exit tutorial' }).click()
  await expect(card).toHaveCount(0)
  expect(await page.evaluate(() => sessionStorage.getItem('dws-blog:tutorial'))).toBeNull()

  await page.reload()
  await expect(cardLinks(page, posts)).toHaveCount(posts.length)
  await expect(card).toHaveCount(0)
})

test('T16 Escape inside the card closes the tour, and the card can be minimized', async ({
  page,
  posts,
}) => {
  await openList(page, posts, VIEWPORTS.mobile, { path: '/?mode=tutorial' })
  const card = tourCard(page)
  const minimize = card.getByRole('button', { name: 'Minimize tutorial' })

  await minimize.click()
  await expect(minimize).toHaveAttribute('aria-expanded', 'false')
  await expect(card.getByRole('heading')).toHaveCount(0)
  await expect(page.locator('[data-tour="ghost"]'), 'no ghost while minimized').toHaveCount(0)
  await minimize.click()
  await expect(card.getByRole('heading')).toBeVisible()

  await card.getByRole('button', { name: 'Skip', exact: true }).focus()
  await page.keyboard.press('Escape')
  await expect(card).toHaveCount(0)
})

test('T17 the ghost points at the search field, and with reduced motion it gets there without moving', async ({
  page,
  posts,
}) => {
  await openList(page, posts, VIEWPORTS.desktop, { path: '/?mode=tutorial' })
  const ghost = page.locator('[data-tour="ghost"]')
  const field = page.getByRole('searchbox', { name: 'Search' })
  const duration = () => ghost.evaluate((node) => getComputedStyle(node).transitionDuration)

  // The pointer has a box of its own: a zero-width ghost passes every
  // position check and shows nothing.
  await expect(ghost.locator('svg')).toBeVisible()
  // The control: with motion, the ghost travels.
  expect(await duration()).not.toBe('0s')
  await expect.poll(() => ghostPoint(page), { message: 'the ghost at the field' }).toEqual(
    await centerOf(field),
  )

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  await expect(ghost).toHaveCount(1)
  expect(await duration()).toBe('0s')
  await expect.poll(() => ghostPoint(page), { message: 'the ghost at the field' }).toEqual(
    await centerOf(field),
  )
})

test('T18 the card has no serious or critical accessibility violation, on mobile and desktop', async ({
  page,
  posts,
}) => {
  for (const viewport of [VIEWPORTS.mobile, VIEWPORTS.desktop]) {
    await openList(page, posts, viewport, { path: '/?mode=tutorial' })
    await expect(tourCard(page)).toBeVisible()
    const { violations } = await new AxeBuilder({ page })
      .include('aside[aria-label="Tutorial"]')
      .analyze()
    const blocking = violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    )
    expect(blocking.map((violation) => violation.id), `at ${viewport.width}px`).toEqual([])
  }
})
