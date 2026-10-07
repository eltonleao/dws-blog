import type { Locator, Page } from '@playwright/test'
import { expect, test, VIEWPORTS, type ApiPost } from './fixtures'
import { backButton, openPost, postHeading } from './post-support'
import { cardLinks, openList, SIZES, type Size } from './support'

// The API answers on this origin: E5 counts what reaches it.
const API_ORIGIN = 'https://tech-test-backend.dwsbrazil.io'

const scrollY = (page: Page) => page.evaluate(() => window.scrollY)

// The search, the category and the sort are not the same controls at the two
// sizes: below 1024 the search is a panel and the category a dropdown, from
// 1024 up they are a field and a sidebar. E1 drives both.

async function searchFor(page: Page, size: Size, text: string) {
  if (size === 'desktop') {
    await page.getByRole('searchbox', { name: 'Search' }).fill(text)
    return
  }
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  const panel = page.getByRole('dialog', { name: 'Search' })
  await panel.getByRole('searchbox', { name: 'Search' }).fill(text)
  await panel.getByRole('button', { name: 'Close search' }).click()
  await expect(panel, `${size}: the search panel closes`).toBeHidden()
}

async function searchValue(page: Page, size: Size): Promise<string> {
  if (size === 'desktop') {
    return page.getByRole('searchbox', { name: 'Search' }).inputValue()
  }
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  const panel = page.getByRole('dialog', { name: 'Search' })
  const value = await panel.getByRole('searchbox', { name: 'Search' }).inputValue()
  await panel.getByRole('button', { name: 'Close search' }).click()
  await expect(panel, `${size}: the search panel closes`).toBeHidden()
  return value
}

async function pickTechnology(page: Page, size: Size) {
  if (size === 'desktop') {
    // The sidebar only applies on Apply filters (C6).
    await page.getByRole('button', { name: 'Technology', exact: true }).click()
    await page.getByRole('button', { name: 'Apply filters' }).click()
    return
  }
  // The dropdown applies on every choice, and stays open until Esc (C5).
  await page.locator('button[aria-haspopup="listbox"]').first().click()
  await page.getByRole('option', { name: 'Technology', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('listbox'), `${size}: the dropdown closes`).toBeHidden()
}

async function expectTechnology(page: Page, size: Size, chosen: boolean) {
  if (size === 'desktop') {
    await expect(
      page.getByRole('button', { name: 'Technology', exact: true }),
      `${size}: Technology in the sidebar`,
    ).toHaveAttribute('aria-pressed', String(chosen))
    return
  }
  const dropdown = page.locator('button[aria-haspopup="listbox"]').first()
  if (chosen) {
    await expect(dropdown, `${size}: the dropdown shows Technology`).toContainText('Technology')
  } else {
    await expect(dropdown, `${size}: the dropdown does not show Technology`).not.toContainText('Technology')
  }
}

async function sortOldest(page: Page, size: Size) {
  await page.getByRole('button', { name: 'Newest first', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Oldest first', exact: true }),
    `${size}: the sort button says Oldest first`,
  ).toBeVisible()
}

/** Opens the card at `index`, waits for its post, and presses Back. */
async function openCardAndGoBack(
  page: Page,
  posts: ApiPost[],
  links: Locator,
  index: number,
  size: Size,
) {
  const title = ((await links.nth(index).textContent()) ?? '').trim()
  const post = posts.find((candidate) => candidate.title === title)
  if (!post) throw new Error(`${size}: no post is titled "${title}"`)
  await links.nth(index).click()
  await expect(postHeading(page, post), `${size}: the post "${title}" opens`).toBeVisible()
  await backButton(page).click()
}

test('E1 Back keeps the search, the filter, the order and the scroll of the list, at 375 and 1440', async ({
  page,
  posts,
}) => {
  test.slow()

  for (const size of SIZES) {
    const links = await openList(page, posts, VIEWPORTS[size])
    const oldest = page.getByRole('button', { name: 'Oldest first', exact: true })

    // The long list first. The search "a" matches all 26 posts, so the page is
    // long enough for a scroll position to mean something.
    await searchFor(page, size, 'a')
    await sortOldest(page, size)
    await expect(links, `${size}: the cards for "a" and Oldest`).toHaveCount(posts.length)
    const longList = await links.allTextContents()

    await page.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }))
    await expect
      .poll(() => scrollY(page), { message: `${size}: the list is scrolled` })
      .toBeGreaterThan(1000)
    const inView = await links.evaluateAll((elements) =>
      elements.findIndex((element) => {
        const rect = element.getBoundingClientRect()
        return rect.top >= 0 && rect.bottom <= window.innerHeight
      }),
    )
    expect(inView, `${size}: a card is fully in view`).toBeGreaterThan(0)
    const scrolled = await scrollY(page)

    await openCardAndGoBack(page, posts, links, inView, size)

    await expect(links, `${size}: the cards after Back`).toHaveCount(posts.length)
    await expect
      .poll(async () => Math.abs((await scrollY(page)) - scrolled), {
        message: `${size}: scrollY after Back, expected ${scrolled} (+-2)`,
      })
      .toBeLessThanOrEqual(2)
    expect(await links.allTextContents(), `${size}: the same cards, in the same order`).toEqual(longList)
    expect(await searchValue(page, size), `${size}: the search after Back`).toBe('a')
    await expect(oldest, `${size}: the order after Back`).toBeVisible()
    await expectTechnology(page, size, false)

    // Then the combination the matrix line names: "a", Technology and Oldest
    // leave one card, so this list cannot scroll and its position stays where
    // the page puts it.
    await pickTechnology(page, size)
    await expect(links, `${size}: the cards for "a", Technology and Oldest`).toHaveCount(1)
    const filtered = await links.allTextContents()
    const resting = await scrollY(page)

    await openCardAndGoBack(page, posts, links, 0, size)

    await expect(links, `${size}: the filtered card after Back`).toHaveCount(1)
    await expect
      .poll(async () => Math.abs((await scrollY(page)) - resting), {
        message: `${size}: scrollY after Back, expected ${resting} (+-2)`,
      })
      .toBeLessThanOrEqual(2)
    expect(await links.allTextContents(), `${size}: the same filtered card`).toEqual(filtered)
    expect(await searchValue(page, size), `${size}: the search after Back`).toBe('a')
    await expect(oldest, `${size}: the order after Back`).toBeVisible()
    await expectTechnology(page, size, true)
  }
})

test('E2 a post opens at the top of the page, from the end of the list', async ({
  page,
  posts,
}) => {
  const post = posts[posts.length - 1]

  for (const size of SIZES) {
    const links = await openList(page, posts, VIEWPORTS[size])
    const last = links.last()
    await expect(last, `${size}: the last card is the last post of the API`).toHaveText(post.title)

    await page.evaluate(() =>
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
    )
    await expect
      .poll(() => scrollY(page), { message: `${size}: the list is scrolled to its end` })
      .toBeGreaterThan(1000)

    await last.click()

    await expect(postHeading(page, post), `${size}: the last post opens`).toBeVisible()
    await expect
      .poll(() => scrollY(page), { message: `${size}: scrollY on the post page` })
      .toBe(0)
  }
})

test('E3 Back on a post opened in a fresh page goes to the list', async ({
  page,
  posts,
}) => {
  // The first navigation of this page is the post itself: there is nothing
  // behind it to go back to.
  await openPost(page, posts[1], VIEWPORTS.desktop)

  await backButton(page).click()

  await expect(cardLinks(page, posts), 'the list after Back').toHaveCount(posts.length)
  expect(new URL(page.url()).pathname, 'the path after Back').toBe('/')
})

test('E4 reloading a post page shows the post', async ({ page, posts }) => {
  const post = posts[1]
  await openPost(page, post, VIEWPORTS.desktop)

  await page.reload()

  await expect(postHeading(page, post), 'the post after the reload').toBeVisible()
  expect(new URL(page.url()).pathname, 'the path after the reload').toBe(`/posts/${post.id}`)
})

test('E5 the list, a post, Back and another post make one request to /posts/ in total', async ({
  page,
  posts,
}) => {
  // What reaches the API, from the first navigation on. The preflight of a
  // cross-origin request is not a request of the app, so OPTIONS is left out.
  const requests: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.origin === API_ORIGIN && request.method() !== 'OPTIONS') {
      requests.push(`${request.method()} ${url.pathname}`)
    }
  })

  const links = await openList(page, posts, VIEWPORTS.desktop)
  await links.nth(0).click()
  await expect(postHeading(page, posts[0]), 'the first post').toBeVisible()
  await backButton(page).click()
  await expect(links, 'the list after Back').toHaveCount(posts.length)
  await links.nth(1).click()
  await expect(postHeading(page, posts[1]), 'the second post').toBeVisible()

  expect(requests, 'requests to the API in the whole walk').toEqual(['GET /posts/'])
})
