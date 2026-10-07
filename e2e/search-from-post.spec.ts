import type { Locator, Page } from '@playwright/test'
import { expect, test, VIEWPORTS } from './fixtures'
import { openPost, postHeading } from './post-support'
import { cardLinks } from './support'

// The header is the same on every page, the search included. Typing in it on a
// post takes the reader to the list with the term, in one new history entry,
// and the field keeps the focus, so the next keys go on filtering the list.
// In the snapshot, "h" leaves 24 posts and "hea" leaves 3.

const readUrl = (page: Page) => {
  const url = new URL(page.url())
  return { path: url.pathname, q: url.searchParams.get('q') }
}

const historyLength = (page: Page) => page.evaluate(() => history.length)

const caretOf = (field: Locator) =>
  field.evaluate((input: HTMLInputElement) => input.selectionStart)

// Under the open panel the list is out of reach, so its cards are counted in
// the DOM: each card holds one link, to its post.
const cardsUnderPanel = (page: Page) => page.locator('main a[href^="/posts/"]')

test('the search field in the header of a post opens the list with the term at 1440, keeps the focus, and Back returns to the post', async ({
  page,
  posts,
}) => {
  const post = posts[2]
  await openPost(page, post, VIEWPORTS.desktop)
  const field = page.getByRole('searchbox', { name: 'Search' })
  await expect(field, 'the search field in the header of the post').toBeVisible()
  const before = await historyLength(page)

  await field.click()
  await page.keyboard.type('h')
  await expect
    .poll(() => readUrl(page), { message: 'the first key opens the list with the term' })
    .toEqual({ path: '/', q: 'h' })
  await expect(cardLinks(page, posts), 'cards for "h"').toHaveCount(24)
  expect(await historyLength(page), 'the first key stacks one entry').toBe(before + 1)
  await expect(field, 'the field keeps the focus on the list').toBeFocused()

  // The next keys go to the same field, without clicking it again.
  await page.keyboard.type('ea')
  await expect(cardLinks(page, posts), 'cards for "hea"').toHaveCount(3)
  await expect
    .poll(() => readUrl(page), { message: 'the URL follows the typing' })
    .toEqual({ path: '/', q: 'hea' })
  expect(await historyLength(page), 'the next keys stack nothing').toBe(before + 1)
  await expect(field, 'the field after three keys').toBeFocused()
  await expect(field).toHaveValue('hea')
  expect(await caretOf(field), 'the cursor at the end of the term').toBe(3)

  await page.goBack()
  await expect(postHeading(page, post), 'Back returns to the post').toBeVisible()
  expect(readUrl(page).path, 'the address after Back').toBe(`/posts/${post.id}`)
})

test('the search panel opened on a post at 375 shows the list under it as the reader types, and Back returns to the post', async ({
  page,
  posts,
}) => {
  const post = posts[2]
  await openPost(page, post, VIEWPORTS.mobile)
  const button = page.getByRole('button', { name: 'Search', exact: true })
  await expect(button, 'the search button in the header of the post').toBeVisible()
  const before = await historyLength(page)

  await button.click()
  const panel = page.getByRole('dialog', { name: 'Search' })
  const field = panel.getByRole('searchbox', { name: 'Search' })
  await expect(field, 'the panel opens with the focus in its field').toBeFocused()

  await page.keyboard.type('h')
  await expect
    .poll(() => readUrl(page), { message: 'the first key opens the list with the term' })
    .toEqual({ path: '/', q: 'h' })
  await expect(cardsUnderPanel(page), 'cards for "h" under the panel').toHaveCount(24)
  expect(await historyLength(page), 'the first key stacks one entry').toBe(before + 1)
  await expect(panel, 'the panel stays open over the list').toBeVisible()
  await expect(field, 'the panel field keeps the focus').toBeFocused()

  await page.keyboard.type('ea')
  await expect(panel.getByRole('link'), 'titles for "hea" in the panel').toHaveCount(3)
  await expect(cardsUnderPanel(page), 'cards for "hea" under the panel').toHaveCount(3)
  await expect
    .poll(() => readUrl(page), { message: 'the URL follows the typing' })
    .toEqual({ path: '/', q: 'hea' })
  expect(await historyLength(page), 'the next keys stack nothing').toBe(before + 1)
  await expect(field, 'the panel field after three keys').toBeFocused()
  expect(await caretOf(field), 'the cursor at the end of the term').toBe(3)

  await panel.getByRole('button', { name: 'Close search' }).click()
  await expect(panel, 'the panel closes').toBeHidden()
  await expect(cardLinks(page, posts), 'cards for "hea" on the list').toHaveCount(3)
  await expect(button, 'the focus back on the search button').toBeFocused()

  await page.goBack()
  await expect(postHeading(page, post), 'Back returns to the post').toBeVisible()
  expect(readUrl(page).path, 'the address after Back').toBe(`/posts/${post.id}`)
})
