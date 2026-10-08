import type { ElementHandle, Locator, Page } from '@playwright/test'
import { expect, VIEWPORTS, type ApiPost } from './fixtures'

// Helpers shared by the browser oracles. No design number lives here: each
// number stays in the spec of the matrix line it comes from.

/** Every measure of the matrix is checked with a tolerance of 1 px. */
export const TOLERANCE = 1

export type Size = keyof typeof VIEWPORTS
export const SIZES: Size[] = ['mobile', 'desktop']

/** The 26 posts of the snapshot share one creation date, in the card's format. */
export const DATE_TEXT = 'Sep 19, 2026'

export function expectNear(actual: number, expected: number, label: string) {
  const message = `${label}: expected ${expected} (+-${TOLERANCE}), got ${actual}`
  expect(actual, message).toBeGreaterThanOrEqual(expected - TOLERANCE)
  expect(actual, message).toBeLessThanOrEqual(expected + TOLERANCE)
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** A card is the link whose accessible name is a post title. */
export function cardLinks(page: Page, posts: ApiPost[]): Locator {
  const titles = posts.map((post) => escapeRegExp(post.title)).join('|')
  return page.getByRole('link', { name: new RegExp(`^(?:${titles})$`) })
}

/**
 * Opens a page at a viewport and waits for its cards. Until the list exists,
 * this is the assertion that fails, so no spec dies on a timeout inside a click.
 */
export async function openList(
  page: Page,
  posts: ApiPost[],
  viewport: { width: number; height: number },
  { path = '/', count = posts.length }: { path?: string; count?: number } = {},
): Promise<Locator> {
  await page.setViewportSize(viewport)
  await page.goto(path)
  const links = cardLinks(page, posts)
  await expect(links, `the cards at ${viewport.width}px`).toHaveCount(count)
  return links
}

/** The card: the nearest ancestor of the title link (or the link) that holds the image. */
export const cardOf = (link: Locator): Locator =>
  link.locator('xpath=ancestor-or-self::*[.//img][1]')

/** The bottom part of the card: the nearest ancestor of the title link that also holds the date. */
export const bodyOf = (link: Locator): Locator =>
  link.locator(`xpath=ancestor::*[contains(., "${DATE_TEXT}")][1]`)

export async function measure(locator: Locator, label: string) {
  await expect(locator, `${label} is on the page`).toBeVisible()
  const box = await locator.boundingBox()
  if (!box) throw new Error(`${label} has no box`)
  return box
}

export async function measureHandle(handle: ElementHandle, label: string) {
  const box = await handle.boundingBox()
  if (!box) throw new Error(`${label} has no box`)
  return box
}

/**
 * The visible box of a control: the element itself, or its first ancestor that
 * draws a border or a rounded corner (the input inside a bordered field, the
 * text inside a pill).
 */
export async function boxedAncestor(locator: Locator, label: string): Promise<ElementHandle> {
  await expect(locator, `${label} is on the page`).toBeVisible()
  const handle = await locator.evaluateHandle((element) => {
    for (let node: Element | null = element; node; node = node.parentElement) {
      const style = getComputedStyle(node)
      const hasBorder =
        parseFloat(style.borderTopWidth) > 0 && style.borderTopStyle !== 'none'
      if (hasBorder || parseFloat(style.borderTopLeftRadius) > 0) return node
    }
    return element
  })
  const element = handle.asElement()
  if (!element) throw new Error(`${label} has no visible box`)
  return element
}

/** The desktop sidebar: the smallest ancestor of Apply filters that also holds a category item. */
export async function sidebarOf(page: Page): Promise<ElementHandle> {
  const apply = page.getByRole('button', { name: 'Apply filters' })
  await expect(apply, 'Apply filters is on the page').toBeVisible()
  const handle = await apply.evaluateHandle((button) => {
    const holdsItem = (node: Element) =>
      Array.from(node.querySelectorAll('button')).some(
        (item) => item.textContent?.trim() === 'Technology',
      )
    let node: Element = button
    while (node.parentElement && !holdsItem(node)) node = node.parentElement
    return node
  })
  const element = handle.asElement()
  if (!element) throw new Error('The sidebar was not found')
  return element
}

/** Computed style values, by CSS property name. */
export async function styleOf(
  target: Locator | ElementHandle,
  properties: string[],
): Promise<Record<string, string>> {
  const read = (element: Element, names: string[]) => {
    const style = getComputedStyle(element)
    return Object.fromEntries(names.map((name) => [name, style.getPropertyValue(name)]))
  }
  // Locator and ElementHandle both have evaluate, but not one callable signature.
  return 'asElement' in target
    ? target.evaluate(read, properties)
    : target.evaluate(read, properties)
}

/**
 * The first words of a post's content: the card summary starts with them.
 * The fixture types only the part of the post the other specs read, so the
 * content field is added here.
 */
export const summaryStart = (post: ApiPost) =>
  (post as ApiPost & { content: string }).content.slice(0, 24)

/**
 * Serves the 26 posts of the snapshot under ids the content map does not have
 * (K4), so the page shows the text of the API and the geometry specs measure
 * the same body they were written against. Returns the posts as served.
 */
export async function serveOutsideContentMap<T extends ApiPost>(page: Page, posts: T[]): Promise<T[]> {
  const served = posts.map((post) => ({ ...post, id: `synthetic-${post.id}` }))
  await page.route(
    (url) => url.origin === 'https://tech-test-backend.dwsbrazil.io' && url.pathname === '/posts/',
    (route) =>
      route.fulfill({
        json: served,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': 'GET, OPTIONS',
        },
      }),
  )
  return served
}

/** How many lines of text an element's content takes, from the rects of its text nodes. */
export async function lineCount(locator: Locator): Promise<number> {
  return locator.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    const rects: DOMRect[] = []
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const range = document.createRange()
      range.selectNodeContents(node)
      rects.push(...Array.from(range.getClientRects()).filter((rect) => rect.width > 0))
    }
    rects.sort((a, b) => a.top - b.top)
    // A rect starts a new line when it sits lower than half its height from the last line.
    let lines = 0
    let lastTop = -Infinity
    for (const rect of rects) {
      if (rect.top - lastTop > rect.height / 2) {
        lines += 1
        lastTop = rect.top
      }
    }
    return lines
  })
}
