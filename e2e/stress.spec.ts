import type { Page, Route } from '@playwright/test'
import { expect, test as base, VIEWPORTS, type ApiPost } from './fixtures'
import { cardLinks, openList } from './support'

// Stress scenarios S1 to S12. Every test builds its own answer of the API on
// top of the e2e fixture (the 26 posts of the snapshot) and checks what the
// reader would see. No test here changes the application.

const API_ORIGIN = 'https://tech-test-backend.dwsbrazil.io'
const IMAGE_HOST = 'dws-tech-test-assets.s3.amazonaws.com'
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
}

// Same as the fixture's guard against page and console errors, except for the
// "Failed to load resource" lines the browser prints for the answers these
// scenarios break on purpose (a 500 from the API, an aborted image).
// `noPageErrors` already exists in the base, so the typings only list `scope`
// for the override; `auto` is read at run time, as in the base fixture.
const guardOptions = { scope: 'test', auto: true } as const
const test = base.extend({
  noPageErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('pageerror', (error) => {
        errors.push(`page error: ${error.message}`)
      })
      page.on('console', (message) => {
        if (message.type() !== 'error') return
        const expected =
          message.text().startsWith('Failed to load resource') &&
          (message.location().url.includes(IMAGE_HOST) ||
            message.location().url.startsWith(API_ORIGIN))
        if (!expected) errors.push(`console error: ${message.text()}`)
      })
      await use()
      expect(errors, 'page and console errors').toEqual([])
    },
    guardOptions,
  ],
})

type Loose = Record<string, unknown>
type Answer = (route: Route) => Promise<void> | void

/** Answers GET /posts/ with `answer`; the route registered last wins over the fixture's. */
async function serveApi(page: Page, answer: Answer) {
  await page.route(
    (url) => url.origin === API_ORIGIN && url.pathname === '/posts/',
    (route) =>
      route.request().method() === 'OPTIONS'
        ? route.fulfill({ status: 204, headers: CORS })
        : answer(route),
  )
}

async function servePosts(page: Page, posts: unknown[]) {
  await serveApi(page, (route) => route.fulfill({ json: posts, headers: CORS }))
}

/** The snapshot with the first post changed. */
function withFirst(posts: ApiPost[], change: Loose): unknown[] {
  return [{ ...(posts[0] as unknown as Loose), ...change }, ...posts.slice(1)]
}

const LOREM = 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor '
// An id with no file in src/content/posts/, so the written text does not cover the injected post.
const UNWRITTEN_ID = 'no-written-text'
const LONG_TITLE = LOREM.repeat(5).slice(0, 300).trim()
const LONG_WORD = 'Supercalifragilistic'.repeat(6).slice(0, 120)

const overflowOf = (page: Page) =>
  page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))

async function expectNoScroll(page: Page, label: string) {
  const { scrollWidth, clientWidth } = await overflowOf(page)
  expect(scrollWidth, `${label}: scrollWidth against clientWidth`).toBe(clientWidth)
}

/** Pairs of siblings in the header and in every card whose boxes cross. */
async function overlappingSiblings(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const found: string[] = []
    const boxOf = (element: Element) => {
      const rect = element.getBoundingClientRect()
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
    }
    const crossing = (parent: Element, label: string) => {
      const kids = [...parent.children]
        .map((element) => ({ element, box: boxOf(element) }))
        .filter(({ box }) => box.right - box.left >= 2 && box.bottom - box.top >= 2)
      for (let i = 0; i < kids.length; i += 1) {
        for (let j = i + 1; j < kids.length; j += 1) {
          const a = kids[i].box
          const b = kids[j].box
          const width = Math.min(a.right, b.right) - Math.max(a.left, b.left)
          const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
          if (width > 1 && height > 1) {
            found.push(`${label}: <${kids[i].element.tagName.toLowerCase()}> and <${kids[j].element.tagName.toLowerCase()}> cross by ${Math.round(width)}x${Math.round(height)}`)
          }
        }
      }
    }
    const header = document.querySelector('header')
    if (header) crossing(header, 'header')
    document.querySelectorAll('article').forEach((card, index) => crossing(card, `card ${index}`))
    return found
  })
}

const cardBox = async (card: ReturnType<Page['locator']>) => {
  const box = await card.boundingBox()
  if (!box) throw new Error('the card has no box')
  return box
}

// ---------------------------------------------------------------- S1

test('S1 a title of 300 characters keeps the card at 369 and 425 high, clamped, inside the card', async ({
  page,
  posts,
}) => {
  await servePosts(page, withFirst(posts, { id: UNWRITTEN_ID, title: LONG_TITLE }))
  for (const [viewport, height] of [
    [VIEWPORTS.mobile, 369],
    [VIEWPORTS.desktop, 425],
  ] as const) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    const card = page.locator('article').first()
    await expect(card.getByRole('link', { name: LONG_TITLE }), `the long card at ${viewport.width}`).toBeVisible()
    const box = await cardBox(card)
    expect(Math.abs(box.height - height), `card height at ${viewport.width}: ${box.height}`).toBeLessThanOrEqual(1)

    const inside = await card.evaluate((element) => {
      const frame = element.getBoundingClientRect()
      const title = element.querySelector('h2')!
      const titleBox = title.getBoundingClientRect()
      // The title is clamped when one of its ancestors in the card clamps lines and hides the rest.
      let clamped = false
      for (let node: Element | null = title; node && node !== element; node = node.parentElement) {
        const style = getComputedStyle(node)
        const lines = style.getPropertyValue('-webkit-line-clamp')
        if (lines && lines !== 'none' && style.overflowY !== 'visible') clamped = true
      }
      return {
        clamped,
        titleInside: titleBox.bottom <= frame.bottom + 0.5 && titleBox.right <= frame.right + 0.5,
        overflowing: element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1,
      }
    })
    expect(inside.clamped, `the title ends in an ellipsis (line clamp) at ${viewport.width}`).toBe(true)
    expect(inside.titleInside, `the title box stays in the card at ${viewport.width}`).toBe(true)
    expect(inside.overflowing, `nothing leaves the card at ${viewport.width}`).toBe(false)
  }
})

// ---------------------------------------------------------------- S2

test('S2 a word of 120 characters in the title, the summary and the body makes no horizontal scroll at 320, 375 and 1440', async ({
  page,
  posts,
}) => {
  const first = posts[0] as unknown as Loose
  const changed = withFirst(posts, {
    id: UNWRITTEN_ID,
    title: `${LONG_WORD} title`,
    content: `${LONG_WORD} summary\n\n${LONG_WORD}\n\nbody ${LONG_WORD}`,
    author: { ...(first.author as Loose), name: `${LONG_WORD.slice(0, 40)} Author` },
  })
  await servePosts(page, changed)
  for (const width of [320, 375, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await expect(page.locator('article').first(), `the list at ${width}`).toBeVisible()
    await expectNoScroll(page, `the list at ${width}`)
    await page.goto(`/posts/${UNWRITTEN_ID}`)
    await expect(page.getByRole('heading', { level: 1 }), `the post at ${width}`).toContainText(LONG_WORD)
    await expectNoScroll(page, `the post at ${width}`)
  }
})

// ---------------------------------------------------------------- S3

test('S3 a post with 12 categories keeps its tags inside the card, on one line, off the summary', async ({
  page,
  posts,
}) => {
  const categories = Array.from({ length: 12 }, (_, index) => ({ id: `s3-${index}`, name: `Category ${index + 1}` }))
  await servePosts(page, withFirst(posts, { categories }))
  for (const viewport of [VIEWPORTS.mobile, VIEWPORTS.desktop]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    const card = page.locator('article').first()
    await expect(card.getByRole('listitem').first(), `a tag at ${viewport.width}`).toBeVisible()
    const measured = await card.evaluate((element) => {
      const frame = element.getBoundingClientRect()
      const tags = element.querySelector('ul')!.getBoundingClientRect()
      const summary = element.querySelector('p:not(:has(time))')?.getBoundingClientRect()
      return {
        frameBottom: frame.bottom,
        tagsTop: tags.top,
        tagsBottom: tags.bottom,
        tagsHeight: tags.height,
        summaryBottom: summary ? summary.bottom : null,
        tagsRight: tags.right,
        frameRight: frame.right,
      }
    })
    expect(measured.tagsBottom, `tags above the card's bottom at ${viewport.width}`).toBeLessThanOrEqual(measured.frameBottom + 0.5)
    expect(measured.tagsRight, `tags inside the card's right edge at ${viewport.width}`).toBeLessThanOrEqual(measured.frameRight + 0.5)
    expect(measured.tagsHeight, `the tag line is one line high at ${viewport.width}`).toBeLessThanOrEqual(33)
    if (measured.summaryBottom !== null) {
      expect(measured.tagsTop, `tags under the summary at ${viewport.width}`).toBeGreaterThanOrEqual(measured.summaryBottom - 0.5)
    }
  }
})

// ---------------------------------------------------------------- S4

test('S4 an author name of 80 characters keeps the meta on one line in the card and the filter item on one line in the sidebar', async ({
  page,
  posts,
}) => {
  const first = posts[0] as unknown as Loose
  const name = 'Maximiliano Alexandrovich Montgomery Featherstonehaugh de la Rosa Fernandez Quintana'.slice(0, 80)
  expect(name.length).toBe(80)
  await servePosts(page, withFirst(posts, { author: { ...(first.author as Loose), id: 's4-author', name } }))

  for (const viewport of [VIEWPORTS.mobile, VIEWPORTS.desktop]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    const card = page.locator('article').first()
    await expect(card.getByText(name), `the long name at ${viewport.width}`).toBeVisible()
    const meta = await card.evaluate((element) => {
      const frame = element.getBoundingClientRect()
      const line = element.querySelector('p:has(time)')!.getBoundingClientRect()
      const date = element.querySelector('time')!.getBoundingClientRect()
      return { lineHeight: line.height, dateHeight: date.height, right: line.right, frameRight: frame.right }
    })
    expect(meta.lineHeight, `the meta is one line high at ${viewport.width}`).toBeLessThanOrEqual(meta.dateHeight + 1)
    expect(meta.right, `the meta stays inside the card at ${viewport.width}`).toBeLessThanOrEqual(meta.frameRight + 0.5)
  }

  // The sidebar: the item of the long name is as high as the item of a short one.
  await page.setViewportSize(VIEWPORTS.desktop)
  await page.goto('/')
  const long = page.getByRole('button', { name, exact: true })
  const short = page.getByRole('button', { name: (posts[1].author as { name: string }).name, exact: true })
  await expect(long, 'the long author in the sidebar').toBeVisible()
  const longBox = await long.boundingBox()
  const shortBox = await short.boundingBox()
  const sidebarBox = await page.locator('section[aria-labelledby]').first().boundingBox()
  expect(longBox && shortBox && sidebarBox, 'boxes of the sidebar items').toBeTruthy()
  expect(longBox!.height, 'the long item is as high as a short one').toBeLessThanOrEqual(shortBox!.height + 1)
  expect(longBox!.x + longBox!.width, 'the long item stays in the sidebar').toBeLessThanOrEqual(sidebarBox!.x + sidebarBox!.width + 0.5)
})

// ---------------------------------------------------------------- S5

test('S5 an API with 0 posts says No posts found, and Clear filters leaves the page standing', async ({ page }) => {
  await servePosts(page, [])
  for (const viewport of [VIEWPORTS.mobile, VIEWPORTS.desktop]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page.getByText('No posts found'), `the empty state at ${viewport.width}`).toBeVisible()
    await expect(page.locator('article'), `no card at ${viewport.width}`).toHaveCount(0)
    const clear = page.getByRole('button', { name: 'Clear filters' })
    if (await clear.count()) {
      await clear.click()
      await expect(page.getByText('No posts found'), `the empty state after Clear filters at ${viewport.width}`).toBeVisible()
    }
    await expect(page.getByRole('heading', { level: 1 }), `the page title at ${viewport.width}`).toBeAttached()
  }
})

// ---------------------------------------------------------------- S6

test('S6 an API with 1000 posts shows the first card within 3 s and renders all of them without error', async ({ page, posts }, testInfo) => {
  test.setTimeout(60_000)
  const many = Array.from({ length: 1000 }, (_, index) => {
    const source = posts[index % posts.length] as unknown as Loose
    return { ...source, id: `s6-${index}`, title: `${index} ${source.title as string}` }
  })
  await servePosts(page, many)
  await page.setViewportSize(VIEWPORTS.desktop)
  const started = Date.now()
  await page.goto('/')
  await page.locator('article').first().waitFor({ state: 'visible', timeout: 15_000 })
  const firstCardMs = Date.now() - started
  testInfo.annotations.push({ type: 'S6 first card (ms)', description: String(firstCardMs) })
  await expect(page.locator('article'), 'all 1000 cards').toHaveCount(1000, { timeout: 20_000 })
  testInfo.annotations.push({ type: 'S6 all cards (ms)', description: String(Date.now() - started) })
  expect(firstCardMs, `the first card appeared after ${firstCardMs} ms`).toBeLessThan(3000)
})

// ---------------------------------------------------------------- S7

test('S7 with every image failing, the card shows a Neutral Extra-Light block 150 and 196 high and no broken image', async ({
  page,
  posts,
}) => {
  await page.route((url) => url.hostname === IMAGE_HOST, (route) => route.abort())
  for (const [viewport, height] of [
    [VIEWPORTS.mobile, 150],
    [VIEWPORTS.desktop, 196],
  ] as const) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(cardLinks(page, posts), `cards at ${viewport.width}`).toHaveCount(posts.length)
    // The images load lazily: bring every card into view so each one has tried its image.
    const cards = page.locator('article')
    for (let index = 0; index < posts.length; index += 1) {
      await cards.nth(index).scrollIntoViewIfNeeded()
    }
    await expect(page.locator('article img'), `no image left in the cards at ${viewport.width}`).toHaveCount(0)
    await page.evaluate(() => window.scrollTo(0, 0))
    const block = page.locator('article').first().locator('> :first-child')
    const measured = await block.evaluate((element) => ({
      height: element.getBoundingClientRect().height,
      background: getComputedStyle(element).backgroundColor,
      tag: element.tagName,
    }))
    expect(measured.tag, `the first thing of the card at ${viewport.width}`).not.toBe('IMG')
    expect(Math.abs(measured.height - height), `block height at ${viewport.width}: ${measured.height}`).toBeLessThanOrEqual(1)
    expect(measured.background, `block colour at ${viewport.width}`).toBe('rgb(224, 226, 230)')
  }
  await page.goto(`/posts/${posts[0].id}`)
  await expect(page.getByRole('heading', { level: 1, name: posts[0].title })).toBeVisible()
  await expect
    .poll(() => page.locator('img').count(), { message: 'images left on the post page' })
    .toBe(0)
})

// ---------------------------------------------------------------- S8

test('S8 a slow API shows the skeleton, a 500 and a broken JSON show Try again, and an invalid post leaves the list standing', async ({
  page,
  posts,
}) => {
  test.setTimeout(60_000)
  await page.setViewportSize(VIEWPORTS.desktop)

  // 1. The answer takes 5 s: the skeleton, then the cards.
  await serveApi(page, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 5000))
    await route.fulfill({ json: posts, headers: CORS })
  })
  await page.goto('/', { waitUntil: 'commit' })
  await expect(page.getByText('Loading posts'), 'the loading status while the API waits').toBeVisible()
  await expect(page.locator('ul[aria-hidden="true"] > li'), 'the skeleton cards').toHaveCount(6)
  await expect(page.locator('article'), 'no card before the answer').toHaveCount(0)
  await expect(cardLinks(page, posts), 'the cards after 5 s').toHaveCount(posts.length, { timeout: 15_000 })

  // 2. A 500, then Try again with the API back.
  let healthy = false
  await serveApi(page, (route) =>
    healthy
      ? route.fulfill({ json: posts, headers: CORS })
      : route.fulfill({ status: 500, json: { message: 'boom' }, headers: CORS }),
  )
  await page.goto('/')
  await expect(page.getByRole('alert'), 'the error after a 500').toContainText('Something went wrong')
  healthy = true
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(cardLinks(page, posts), 'the cards after Try again').toHaveCount(posts.length)

  // 3. A 200 with a body that is not JSON, then Try again.
  healthy = false
  await serveApi(page, (route) =>
    healthy
      ? route.fulfill({ json: posts, headers: CORS })
      : route.fulfill({ status: 200, contentType: 'application/json', body: '[{"id": "a", "title": ', headers: CORS }),
  )
  await page.goto('/')
  await expect(page.getByRole('alert'), 'the error after a broken JSON').toContainText('Something went wrong')
  healthy = true
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(cardLinks(page, posts), 'the cards after Try again, broken JSON').toHaveCount(posts.length)

  // 4. A post with no title and no categories among the valid ones.
  await servePosts(page, [
      {
        id: 's8-invalid',
        content: 'no title here',
        createdAt: '2026-09-19T10:00:00.000Z',
        author: { id: 's8-author', name: 'Nobody Atall' },
      },
      ...posts,
    ])
  await page.goto('/')
  await expect(cardLinks(page, posts), 'the valid posts around the invalid one').toHaveCount(posts.length)
  await expect(page.locator('article'), 'the invalid post is not a card').toHaveCount(posts.length)
})

// ---------------------------------------------------------------- S9

const S9_VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 768, height: 1024 },
  { width: 1023, height: 900 },
  { width: 1024, height: 900 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
  { width: 844, height: 390 },
]

test('S9 from 320 to 2560 and on a landscape phone, nothing scrolls sideways and no sibling boxes cross', async ({
  page,
  posts,
}) => {
  test.setTimeout(90_000)
  const problems: string[] = []
  for (const viewport of S9_VIEWPORTS) {
    await openList(page, posts, viewport)
    const { scrollWidth, clientWidth } = await overflowOf(page)
    if (scrollWidth > clientWidth) problems.push(`${viewport.width}x${viewport.height}: scrollWidth ${scrollWidth} is over clientWidth ${clientWidth}`)
    for (const crossing of await overlappingSiblings(page)) problems.push(`${viewport.width}x${viewport.height}: ${crossing}`)
  }
  expect(problems, 'layout problems').toEqual([])
})

// ---------------------------------------------------------------- S10

test.describe('zoom of 200%', () => {
  test.use({ deviceScaleFactor: 2 })

  test('S10 at 1440 zoomed to 200% (720 wide, scale 2) nothing scrolls sideways and no sibling boxes cross', async ({
    page,
    posts,
  }) => {
    await openList(page, posts, { width: 720, height: 450 })
    expect(await page.evaluate(() => window.devicePixelRatio), 'the device scale factor').toBe(2)
    const { scrollWidth, clientWidth } = await overflowOf(page)
    expect(scrollWidth, 'scrollWidth against clientWidth at 720').toBeLessThanOrEqual(clientWidth)
    expect(await overlappingSiblings(page), 'crossing siblings at 720').toEqual([])
  })
})

// ---------------------------------------------------------------- S11

test('S11 50 quick changes of filter, order and search leave no error and a URL that matches the screen', async ({
  page,
  posts,
}, testInfo) => {
  test.setTimeout(60_000)
  await openList(page, posts, VIEWPORTS.desktop)
  const search = page.getByRole('searchbox', { name: 'Search' })
  const sort = page.getByRole('button', { name: /^(Newest|Oldest) first$/ })
  const category = page.getByRole('button', { name: posts[0].categories[0].name, exact: true })
  const apply = page.getByRole('button', { name: 'Apply filters' })

  const started = Date.now()
  for (let step = 0; step < 50; step += 1) {
    if (step % 3 === 0) await sort.click()
    else if (step % 3 === 1) await search.fill(step % 2 === 0 ? '' : 'a')
    else {
      await category.click()
      await apply.click()
    }
  }
  testInfo.annotations.push({ type: 'S11 50 changes (ms)', description: String(Date.now() - started) })

  const screen = await page.evaluate(() => ({
    q: (document.querySelector('input[type="search"], [role="searchbox"]') as HTMLInputElement | null)?.value ?? '',
    order: [...document.querySelectorAll('button')].some((button) => button.textContent?.trim() === 'Oldest first') ? 'oldest' : 'newest',
    categories: [...document.querySelectorAll('button[aria-pressed="true"]')].map((button) => button.textContent?.trim() ?? ''),
  }))
  await expect
    .poll(
      () => {
        const params = new URL(page.url()).searchParams
        return {
          q: params.get('q') ?? '',
          order: params.get('order') ?? 'newest',
          categories: params.getAll('category').sort(),
        }
      },
      { message: 'the URL matches the screen' },
    )
    .toEqual({ q: screen.q, order: screen.order, categories: screen.categories.sort() })
})

// ---------------------------------------------------------------- S12

test('S12 a search of 500 characters, of regular-expression symbols and of emoji raises no error and shows the empty state', async ({
  page,
  posts,
}) => {
  await openList(page, posts, VIEWPORTS.desktop)
  const search = page.getByRole('searchbox', { name: 'Search' })
  const empty = page.getByText('No posts found')

  await search.fill('ab'.repeat(250))
  await expect(empty, 'the empty state for 500 characters').toBeVisible()

  await search.fill('')
  await expect(cardLinks(page, posts), 'all cards after clearing').toHaveCount(posts.length)
  await search.pressSequentially('.*+?^${}()|[]\\')
  await expect(empty, 'the empty state for regular-expression symbols').toBeVisible()
  await expect(page.locator('article'), 'no card matches the symbols').toHaveCount(0)

  await search.fill('')
  await search.fill('🚀🔥😀')
  await expect(empty, 'the empty state for emoji').toBeVisible()

  await search.fill('')
  await expect(cardLinks(page, posts), 'all cards after the last clearing').toHaveCount(posts.length)
})
