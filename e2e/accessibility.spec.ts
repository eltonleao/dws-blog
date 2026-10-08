import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, test, VIEWPORTS } from './fixtures'
import { openList, SIZES } from './support'

// An exception is allowed only by rule and selector, each one written in
// problems.md with its reason. It starts empty.
const ACCEPTED: { rule: string; selector: string }[] = []

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
    .filter(
      (found) => !ACCEPTED.some((ok) => ok.rule === found.rule && ok.selector === found.selector),
    )
}

interface Stop {
  tag: string
  type: string | null
  label: string
  popup: string | null
  pressed: string | null
  inBanner: boolean
  outlineStyle: string
  outlineWidth: number
}

function activeStop(page: Page): Promise<Stop> {
  return page.evaluate(() => {
    const element = document.activeElement as HTMLElement
    const style = getComputedStyle(element)
    return {
      tag: element.tagName.toLowerCase(),
      type: element.getAttribute('type'),
      label: (element.getAttribute('aria-label') ?? element.textContent ?? '')
        .replace(/\s+/g, ' ')
        .trim(),
      popup: element.getAttribute('aria-haspopup'),
      pressed: element.getAttribute('aria-pressed'),
      inBanner: element.closest('header, [role="banner"]') !== null,
      outlineStyle: style.outlineStyle,
      outlineWidth: parseFloat(style.outlineWidth),
    }
  })
}

test('E9 Tab walks the header, search, filters, sort and cards, with an outline on every stop', async ({
  page,
  posts,
}) => {
  const titles = new Set(posts.map((post) => post.title))
  const kindOf = (stop: Stop) => {
    if (stop.tag === 'a' && titles.has(stop.label)) return 'card'
    if (/^(Newest|Oldest) first$/.test(stop.label)) return 'sort'
    if (stop.type === 'search' || stop.tag === 'input') return 'search'
    if (stop.tag === 'button' && /^search$/i.test(stop.label)) return 'search'
    // The language switch is in the banner and its buttons carry aria-pressed too.
    if (stop.inBanner && stop.pressed !== null) return 'header'
    if (stop.popup === 'listbox' || stop.pressed !== null || /^(Apply|Clear) filters$/.test(stop.label)) {
      return 'filter'
    }
    return stop.inBanner ? 'header' : 'other'
  }

  for (const size of SIZES) {
    await openList(page, posts, VIEWPORTS[size])
    const stops: Stop[] = []
    const kinds: string[] = []
    for (let press = 0; press < 40 && kinds.filter((kind) => kind === 'card').length < 3; press += 1) {
      await page.keyboard.press('Tab')
      const stop = await activeStop(page)
      stops.push(stop)
      kinds.push(kindOf(stop))
    }

    for (const stop of stops) {
      expect(stop.outlineStyle, `${size}: outline-style of "${stop.label}"`).not.toBe('none')
      expect(stop.outlineWidth, `${size}: outline-width of "${stop.label}"`).toBeGreaterThan(0)
    }

    const first = ['header', 'search', 'filter', 'sort', 'card'].map((kind) => kinds.indexOf(kind))
    const message = `${size}: Tab stops were ${kinds.join(', ')}`
    expect(first, `${message} (every part needs a stop)`).not.toContain(-1)
    expect(first, `${message} (the parts follow the page order)`).toEqual(
      [...first].sort((a, b) => a - b),
    )
  }
})

test('E10 axe finds no serious or critical violation on the list, the post, the open dropdown and the search panel', async ({
  page,
  posts,
}) => {
  test.setTimeout(120_000)
  const found: Record<string, unknown[]> = {}
  const scan = async (scenario: string) => {
    found[scenario] = await blockingViolations(page)
  }

  for (const size of SIZES) {
    await openList(page, posts, VIEWPORTS[size])
    await scan(`${size}: list`)

    await page.goto(`/posts/${posts[0].id}`)
    await expect(
      page.getByRole('heading', { level: 1, name: posts[0].title }),
      `${size}: the post page`,
    ).toBeVisible()
    await scan(`${size}: post`)

    // The dropdown and the search panel only exist below 1024.
    if (size === 'mobile') {
      await openList(page, posts, VIEWPORTS[size])
      await page.locator('button[aria-haspopup="listbox"]').first().click()
      await expect(page.getByRole('listbox'), `${size}: the open dropdown`).toBeVisible()
      await scan(`${size}: dropdown open`)

      await openList(page, posts, VIEWPORTS[size])
      await page.getByRole('button', { name: 'Search', exact: true, expanded: false }).click()
      const panel = page.getByRole('dialog', { name: 'Search' })
      await expect(panel, `${size}: the search panel`).toBeVisible()
      await panel.getByRole('searchbox', { name: 'Search' }).fill('tech')
      await expect(panel.getByRole('link'), `${size}: titles listed by the panel`).toHaveCount(6)
      await scan(`${size}: search panel`)
    }
  }

  const withViolations = Object.fromEntries(
    Object.entries(found).filter(([, violations]) => violations.length > 0),
  )
  expect(withViolations, 'serious or critical axe violations, by scenario').toEqual({})
})
