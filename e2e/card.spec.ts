import { expect, test, VIEWPORTS } from './fixtures'
import {
  bodyOf,
  boxedAncestor,
  cardOf,
  DATE_TEXT,
  expectNear,
  lineCount,
  measure,
  measureHandle,
  openList,
  serveOutsideContentMap,
  SIZES,
  styleOf,
  summaryStart,
  TOLERANCE,
} from './support'

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'

test('E6 the whole card goes to its post, and Tab stops once per card', async ({ page, posts }) => {
  for (const size of SIZES) {
    const links = await openList(page, posts, VIEWPORTS[size])
    const first = posts[0]

    // The card holds one focusable thing: the stretched title link.
    await expect(
      cardOf(links.nth(0)).locator(FOCUSABLE),
      `${size}: focusable things in the first card`,
    ).toHaveCount(1)

    // Tab walks from card to card, one stop each.
    await links.nth(0).focus()
    for (let index = 1; index <= 3; index += 1) {
      await page.keyboard.press('Tab')
      await expect(links.nth(index), `${size}: Tab number ${index} lands on card ${index}`).toBeFocused()
    }

    // The image and the date line are part of the link: a click on them opens the post.
    for (const part of ['image', 'date line']) {
      await page.goto('/')
      await expect(links, `${size}: cards before clicking the ${part}`).toHaveCount(posts.length)
      const card = cardOf(links.nth(0))
      const target = part === 'image' ? card.locator('img').first() : card.getByText(DATE_TEXT)
      const box = await measure(target, `${size}: the ${part} of the first card`)
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
      await expect(page, `${size}: a click on the ${part}`).toHaveURL(new RegExp(`/posts/${first.id}$`))
    }
  }
})

test('M3 the card has the design radius, image, padding, gap, tag, type sizes and date size', async ({
  page,
  posts: snapshot,
}) => {
  // Posts outside the content map: the card shows the body of the API (K7 of P4).
  const posts = await serveOutsideContentMap(page, snapshot)
  const expected = { mobile: { image: 150, date: '14px' }, desktop: { image: 196, date: '12px' } }

  for (const size of SIZES) {
    const links = await openList(page, posts, VIEWPORTS[size])
    // The first post has a category, so its card has the tag row.
    const post = posts[0]
    const link = links.nth(0)
    const card = cardOf(link)
    const at = (what: string) => `${size}: ${what}`

    await expect(card, at('card radius')).toHaveCSS('border-top-left-radius', '16px')

    const image = await measure(card.locator('img').first(), at('card image'))
    expectNear(image.height, expected[size].image, at('image height'))

    // The bottom part has padding 16 and 16 between its children (meta, text, tags).
    const body = bodyOf(link)
    const padding = await styleOf(body, ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'])
    for (const [side, value] of Object.entries(padding)) {
      expectNear(parseFloat(value), 16, at(side))
    }
    const gaps = await body.evaluate((element) => {
      const boxes = Array.from(element.children).map((child) => child.getBoundingClientRect())
      return boxes.slice(1).map((box, index) => box.top - boxes[index].bottom)
    })
    expect(gaps.length, at('children of the bottom part: meta, text and tags')).toBe(2)
    for (const gap of gaps) expectNear(gap, 16, at('gap between the children of the bottom part'))

    const tag = await boxedAncestor(card.getByText(post.categories[0].name, { exact: true }), at('tag'))
    expectNear((await measureHandle(tag, at('tag'))).height, 32, at('tag height'))
    const tagStyle = await styleOf(tag, ['border-top-left-radius'])
    expect(parseFloat(tagStyle['border-top-left-radius']), at('tag radius')).toBeGreaterThanOrEqual(42 - TOLERANCE)

    const title = await styleOf(link, ['font-size', 'font-weight'])
    expect(title, at('title size and weight')).toEqual({ 'font-size': '20px', 'font-weight': '700' })

    const summary = await styleOf(card.getByText(summaryStart(post)), ['font-size', 'font-weight'])
    expect(summary, at('summary size and weight')).toEqual({ 'font-size': '14px', 'font-weight': '400' })

    const date = await styleOf(card.getByText(DATE_TEXT), ['font-size'])
    expect(date['font-size'], at('date size')).toBe(expected[size].date)
  }
})

test('M4 the summary is a whole number of lines, 3 under a one-line title and 2 under a longer one, and cards in a row are equally tall', async ({
  page,
  posts: snapshot,
}) => {
  // Posts outside the content map: the card shows the body of the API (K7 of P4).
  const posts = await serveOutsideContentMap(page, snapshot)
  test.setTimeout(60_000)

  for (const size of SIZES) {
    await openList(page, posts, VIEWPORTS[size])
    const rows = new Map<number, number[]>()

    for (const post of posts) {
      const at = (what: string) => `${size}: "${post.title}" ${what}`
      const link = page.getByRole('link', { name: post.title, exact: true })
      const card = cardOf(link)
      const summary = card.getByText(summaryStart(post))

      const summaryBox = await measure(summary, at('summary'))
      const lineHeight = parseFloat((await styleOf(summary, ['line-height']))['line-height'])
      expect(lineHeight, at('summary line height in px')).toBeGreaterThan(0)
      const lines = summaryBox.height / lineHeight
      expect(
        Math.abs(lines - Math.round(lines)) * lineHeight,
        at(`summary is ${summaryBox.height}px high with lines of ${lineHeight}px`),
      ).toBeLessThanOrEqual(TOLERANCE)

      const titleLines = await lineCount(link)
      expect(Math.round(lines), at(`summary lines under a title of ${titleLines} line(s)`)).toBe(
        titleLines === 1 ? 3 : 2,
      )

      const cardBox = await measure(card, at('card'))
      const top = Math.round(cardBox.y)
      rows.set(top, [...(rows.get(top) ?? []), cardBox.height])
    }

    if (size === 'desktop') {
      expect(rows.size, 'desktop: several cards share a row').toBeLessThan(posts.length)
      for (const [top, heights] of rows) {
        for (const height of heights) {
          expectNear(height, heights[0], `desktop: card height in the row at y ${top}`)
        }
      }
    }
  }
})
