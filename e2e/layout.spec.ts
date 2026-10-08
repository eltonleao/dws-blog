import { expect, test, VIEWPORTS } from './fixtures'
import {
  boxedAncestor,
  cardLinks,
  cardOf,
  expectNear,
  measure,
  measureHandle,
  openList,
  sidebarOf,
  SIZES,
} from './support'

const WIDTHS = [320, 375, 768, 1023, 1024, 1280, 1440, 1920]

test('E7 there is no horizontal scroll from 320 to 1920, on the list, on the post and with the search panel open', async ({
  page,
  posts,
}) => {
  test.setTimeout(90_000)
  const overflows: string[] = []
  const check = async (what: string, width: number) => {
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }))
    if (scrollWidth > innerWidth) {
      overflows.push(`${what} at ${width}: scrollWidth ${scrollWidth} is over innerWidth ${innerWidth}`)
    }
  }

  for (const width of WIDTHS) {
    await openList(page, posts, { width, height: 900 })
    await check('the list', width)

    // The search panel only exists below 1024; the field is inline from there.
    if (width < 1024) {
      await page.getByRole('button', { name: 'Search', exact: true, expanded: false }).click()
      const panel = page.getByRole('dialog', { name: 'Search' })
      await expect(panel, `the search panel at ${width}`).toBeVisible()
      await panel.getByRole('searchbox', { name: 'Search' }).fill('tech')
      await expect(panel.getByRole('link'), `titles listed by the panel at ${width}`).toHaveCount(6)
      await check('the search panel', width)
    }

    await page.goto(`/posts/${posts[0].id}`)
    await expect(
      page.getByRole('heading', { level: 1, name: posts[0].title }),
      `the post page at ${width}`,
    ).toBeVisible()
    await expect(cardLinks(page, posts), `latest articles at ${width}`).toHaveCount(3)
    await check('the post', width)
  }

  expect(overflows, 'pages wider than the viewport').toEqual([])
})

test('E8 the layout switches at 1024: dropdowns and search button below, sidebar and search field from there', async ({
  page,
  posts,
}) => {
  const dropdowns = page.locator('button[aria-haspopup="listbox"]')
  // Inside the filter sidebar only: the language switch in the header also has aria-pressed buttons.
  const filterItems = page.getByRole('region', { name: 'Filters' }).locator('button[aria-pressed]')
  const searchButton = page.getByRole('button', { name: 'Search', exact: true, expanded: false })
  const searchField = page.getByRole('searchbox', { name: 'Search' })
  const apply = page.getByRole('button', { name: 'Apply filters' })

  const expectBelow1024 = async (at: string) => {
    await expect(dropdowns, `${at}: Category and Author dropdowns`).toHaveCount(2)
    await expect(searchButton, `${at}: search button`).toBeVisible()
    await expect(filterItems, `${at}: no sidebar items`).toHaveCount(0)
    await expect(apply, `${at}: no Apply filters`).toHaveCount(0)
    await expect(searchField, `${at}: no search field`).toHaveCount(0)
  }
  const expectFrom1024 = async (at: string) => {
    await expect(searchField, `${at}: search field`).toBeVisible()
    await expect(apply, `${at}: Apply filters`).toBeVisible()
    await expect(filterItems, `${at}: 6 categories and 4 authors in the sidebar`).toHaveCount(10)
    await expect(dropdowns, `${at}: no dropdowns`).toHaveCount(0)
    await expect(searchButton, `${at}: no search button`).toHaveCount(0)
  }

  await openList(page, posts, { width: 1023, height: 900 })
  await expectBelow1024('loaded at 1023')
  await openList(page, posts, { width: 1024, height: 900 })
  await expectFrom1024('loaded at 1024')

  // The same page follows the viewport, with no reload.
  await page.setViewportSize({ width: 1023, height: 900 })
  await expectBelow1024('resized to 1023')
  await page.setViewportSize({ width: 1024, height: 900 })
  await expectFrom1024('resized to 1024')
})

test('M1 the header has the design height, border, logo, search button and search field', async ({
  page,
  posts,
}) => {
  for (const size of SIZES) {
    await openList(page, posts, VIEWPORTS[size])
    const at = (what: string) => `${size}: ${what}`
    const header = page.getByRole('banner').first()

    const box = await measure(header, at('header'))
    expectNear(box.height, size === 'mobile' ? 64 : 88, at('header height'))
    await expect(header, at('header bottom border width')).toHaveCSS('border-bottom-width', '1px')
    await expect(header, at('header bottom border style')).not.toHaveCSS('border-bottom-style', 'none')

    const logo = await measure(header.locator('a svg, a img').first(), at('logo'))
    expectNear(logo.width, 203.5, at('logo width'))
    expectNear(logo.height, 21.5, at('logo height'))

    if (size === 'mobile') {
      const button = await measure(
        page.getByRole('button', { name: 'Search', exact: true, expanded: false }),
        at('search button'),
      )
      expectNear(button.width, 32, at('search button width'))
      expectNear(button.height, 32, at('search button height'))
    } else {
      const field = await boxedAncestor(page.getByRole('searchbox', { name: 'Search' }), at('search field'))
      const fieldBox = await measureHandle(field, at('search field'))
      expectNear(fieldBox.width, 536, at('search field width'))
      expectNear(fieldBox.height, 56, at('search field height'))
    }
  }
})

test('M2 the grid has the design margins, column widths and gutters', async ({ page, posts }) => {
  // 375: one column of 343 between margins of 16.
  const mobileLinks = await openList(page, posts, VIEWPORTS.mobile)
  const mobileCard = await measure(cardOf(mobileLinks.nth(0)), 'mobile: first card')
  expectNear(mobileCard.x, 16, 'mobile: left margin')
  expectNear(mobileCard.width, 343, 'mobile: card width')
  expectNear(VIEWPORTS.mobile.width - (mobileCard.x + mobileCard.width), 16, 'mobile: right margin')

  // 1440: the sidebar and three cards of 314, with a gutter of 24 and margins of 56.
  const links = await openList(page, posts, VIEWPORTS.desktop)
  const sidebar = await measureHandle(await sidebarOf(page), 'desktop: sidebar')
  expectNear(sidebar.x, 56, 'desktop: left margin')
  expectNear(sidebar.width, 314, 'desktop: sidebar width')

  const cards = [
    await measure(cardOf(links.nth(0)), 'desktop: card 1'),
    await measure(cardOf(links.nth(1)), 'desktop: card 2'),
    await measure(cardOf(links.nth(2)), 'desktop: card 3'),
  ]
  for (const [index, card] of cards.entries()) {
    expectNear(card.width, 314, `desktop: card ${index + 1} width`)
    expectNear(card.y, cards[0].y, `desktop: card ${index + 1} is in the first row`)
  }
  expectNear(cards[0].x - (sidebar.x + sidebar.width), 24, 'desktop: gutter between sidebar and card 1')
  expectNear(cards[1].x - (cards[0].x + cards[0].width), 24, 'desktop: gutter between cards 1 and 2')
  expectNear(cards[2].x - (cards[1].x + cards[1].width), 24, 'desktop: gutter between cards 2 and 3')
  expectNear(
    VIEWPORTS.desktop.width - (cards[2].x + cards[2].width),
    56,
    'desktop: right margin',
  )
})
