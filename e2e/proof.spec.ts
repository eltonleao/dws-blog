import AxeBuilder from '@axe-core/playwright'
import type { Page, Response } from '@playwright/test'
import { expect, test, VIEWPORTS } from './fixtures'
import { cardLinks, openList, SIZES } from './support'

const PROOF_TITLE = 'planted bugs caught'
const FOOTER_LINK = /^How this blog was tested: hunt the \d+ planted bugs$/

const proofHeading = (page: Page) =>
  page.getByRole('heading', { level: 1, name: new RegExp(`${PROOF_TITLE}$`) })

/**
 * Opens /proof at a viewport and waits for its h1. Until the page exists, this
 * is the assertion that fails, so no spec dies on a timeout inside a click.
 */
async function openProof(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport)
  await page.goto('/proof')
  await expect(proofHeading(page), `/proof at ${viewport.width}px`).toBeVisible()
}

const cardButtons = (page: Page) => page.locator('main button[aria-expanded]')

async function openAllCards(page: Page) {
  const total = await cardButtons(page).count()
  expect(total, 'the cards on /proof').toBeGreaterThanOrEqual(56)
  await page
    .locator('main button[aria-expanded="false"]')
    .evaluateAll((buttons) => buttons.forEach((button) => (button as HTMLElement).click()))
  await expect(
    page.locator('main button[aria-expanded="true"]'),
    'every card is open',
  ).toHaveCount(total)
}

// Amended for the explorer branch (07/10/2026): the footer no longer leads to
// /proof, so E13 and E14 enter the page by its address. E13 and E14 became L2;
// the record is in .verification/dentsu-P1/problems.md.

test('L2 (E13, amended) loads the bug hunt in a chunk of its own: / has no way to it and does not ask for it, and /proof by its address does', async ({
  page,
  posts,
}) => {
  const scripts: Response[] = []
  page.on('response', (response) => {
    if (new URL(response.url()).pathname.endsWith('.js')) scripts.push(response)
  })

  await openList(page, posts, VIEWPORTS.desktop)
  const seen = new Set(scripts.map((response) => response.url()))
  expect(seen.size, 'the list loads some scripts').toBeGreaterThan(0)
  for (const response of scripts) {
    expect(
      await response.text(),
      `${response.url()} does not hold the bug hunt`,
    ).not.toContain(PROOF_TITLE)
  }
  await expect(page.getByRole('link', { name: FOOTER_LINK }), 'no footer link to the bug hunt').toHaveCount(0)
  await expect(page.locator('a[href="/proof"]'), 'no link to /proof').toHaveCount(0)
  await expect(page.getByRole('contentinfo'), 'no footer on the list').toHaveCount(0)

  await page.goto('/proof')
  await expect(proofHeading(page), 'the bug hunt h1 by its address').toBeVisible()

  const fresh = scripts.filter((response) => !seen.has(response.url()))
  expect(fresh.length, 'the address asks for a new script').toBeGreaterThan(0)
  const texts = await Promise.all(fresh.map((response) => response.text()))
  expect(
    texts.some((text) => text.includes(PROOF_TITLE)),
    'the new script holds the bug hunt',
  ).toBe(true)
})

test('L2 (E14, amended) opens /proof by its address, Back to the blog goes to / with no footer, and reloading /proof shows the page, at 375 and 1440', async ({
  page,
  posts,
}) => {
  test.slow()

  for (const size of SIZES) {
    await openProof(page, VIEWPORTS[size])
    const footer = page.getByRole('contentinfo')
    await expect(footer, `${size}: the footer of /proof`).toBeVisible()
    await expect(footer.getByRole('link', { name: FOOTER_LINK }), `${size}: no link to /proof`).toHaveCount(0)

    const backToBlog = footer.getByRole('button', { name: 'Back to the blog', exact: true })
    await expect(backToBlog, `${size}: Back to the blog`).toBeVisible()
    await backToBlog.click()
    await expect
      .poll(() => new URL(page.url()).pathname + new URL(page.url()).search, {
        message: `${size}: the address after Back to the blog`,
      })
      .toBe('/')
    await expect(cardLinks(page, posts), `${size}: the cards after Back`).toHaveCount(posts.length)
    await expect(page.getByRole('contentinfo'), `${size}: no footer on the list`).toHaveCount(0)

    await openProof(page, VIEWPORTS[size])
    await page.reload()
    await expect(proofHeading(page), `${size}: /proof after the reload`).toBeVisible()
    expect(new URL(page.url()).pathname).toBe('/proof')
  }
})

test('E15 /proof with every card open has no horizontal scroll from 320 to 1920', async ({
  page,
}) => {
  test.slow()

  await openProof(page, VIEWPORTS.desktop)
  await openAllCards(page)

  for (const width of [320, 375, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 })
    const widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }))
    expect(widths.scroll, `${width}px: scrollWidth ${widths.scroll} over clientWidth ${widths.client}`).toBeLessThanOrEqual(
      widths.client,
    )
  }
})

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

test('E16 /proof has no serious or critical axe violation, closed and open, and Tab reaches every card with an outline, at 375 and 1440', async ({
  page,
}) => {
  test.slow()

  for (const size of SIZES) {
    await openProof(page, VIEWPORTS[size])
    expect(await blockingViolations(page), `${size}: axe with the cards closed`).toEqual([])

    // Tab from the top: every card button takes the focus once, with an outline.
    const total = await cardButtons(page).count()
    expect(total, `${size}: the cards`).toBeGreaterThanOrEqual(56)
    const reached = new Set<string>()
    const bare: string[] = []
    for (let press = 0; press < total + 60 && reached.size < total; press += 1) {
      await page.keyboard.press('Tab')
      const stop = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement
        const style = getComputedStyle(element)
        return {
          card: element.matches('main button[aria-expanded]'),
          label: (element.textContent ?? '').replace(/\s+/g, ' ').trim(),
          outlineStyle: style.outlineStyle,
          outlineWidth: parseFloat(style.outlineWidth),
        }
      })
      if (!stop.card) continue
      reached.add(stop.label)
      if (stop.outlineStyle === 'none' || !(stop.outlineWidth > 0)) bare.push(stop.label)
    }
    expect(reached.size, `${size}: cards reached by Tab`).toBe(total)
    expect(bare, `${size}: cards with no outline`).toEqual([])

    await openAllCards(page)
    expect(await blockingViolations(page), `${size}: axe with every card open`).toEqual([])
  }
})

test('E17 /proof has no transition or animation in main with reduced motion, and has some without it', async ({
  page,
}) => {
  const durations = () =>
    page.evaluate(() => {
      const seconds = (value: string) =>
        value.split(',').map((part) => parseFloat(part) || 0)
      return Array.from(document.querySelectorAll('main, main *')).map((element) => {
        const style = getComputedStyle(element)
        return {
          transition: seconds(style.transitionDuration),
          animation: seconds(style.animationDuration),
        }
      })
    })

  for (const size of SIZES) {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await openProof(page, VIEWPORTS[size])
    const normal = await durations()
    expect(
      normal.some((d) => [...d.transition, ...d.animation].some((value) => value > 0)),
      `${size}: some element moves without the preference`,
    ).toBe(true)

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.reload()
    await expect(proofHeading(page), `${size}: /proof with reduced motion`).toBeVisible()
    const reduced = await durations()
    expect(reduced.length, `${size}: elements in main`).toBeGreaterThan(0)
    const moving = reduced.filter((d) => [...d.transition, ...d.animation].some((value) => value > 0))
    expect(moving, `${size}: elements that still move with reduced motion`).toEqual([])
  }
})
