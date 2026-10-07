import { expect, test, VIEWPORTS } from './fixtures'
import { cardLinks, openList } from './support'

test('E11 a reload keeps the search, the filter and the order, and the URL carries them', async ({
  page,
  posts,
}) => {
  await openList(page, posts, VIEWPORTS.desktop)
  const search = page.getByRole('searchbox', { name: 'Search' })
  const technology = page.getByRole('button', { name: 'Technology', exact: true })
  const links = cardLinks(page, posts)
  const readUrl = () => {
    const params = new URL(page.url()).searchParams
    return { q: params.get('q'), category: params.getAll('category'), order: params.get('order') }
  }

  await search.fill('a')
  await technology.click()
  await page.getByRole('button', { name: 'Apply filters' }).click()
  await page.getByRole('button', { name: 'Newest first', exact: true }).click()

  await expect(links, 'cards for "a", Technology and Oldest').toHaveCount(1)
  const before = await links.allTextContents()
  await expect
    .poll(readUrl, { message: 'the URL carries the state' })
    .toEqual({ q: 'a', category: ['Technology'], order: 'oldest' })

  await page.reload()

  await expect(links, 'cards after the reload').toHaveCount(before.length)
  expect(await links.allTextContents(), 'the same cards after the reload').toEqual(before)
  await expect(search, 'search field after the reload').toHaveValue('a')
  await expect(
    page.getByRole('button', { name: 'Oldest first', exact: true }),
    'sort button after the reload',
  ).toBeVisible()
  await expect(technology, 'Technology after the reload').toHaveAttribute('aria-pressed', 'true')
  expect(readUrl(), 'the URL after the reload').toEqual({
    q: 'a',
    category: ['Technology'],
    order: 'oldest',
  })
})

test('E12 a shared link opens already filtered, and typing in the search does not stack history', async ({
  page,
  posts,
}) => {
  // A new page: the first navigation of this test is the shared link itself.
  await page.setViewportSize(VIEWPORTS.desktop)
  await page.goto('/?category=Technology&category=Science')
  await expect(cardLinks(page, posts), 'cards of the shared link').toHaveCount(2)

  const before = await page.evaluate(() => history.length)
  await page.getByRole('searchbox', { name: 'Search' }).pressSequentially('cli')

  await expect
    .poll(() => new URL(page.url()).searchParams.get('q'), { message: 'the URL follows the typing' })
    .toBe('cli')
  expect(await page.evaluate(() => history.length), 'history.length after three letters').toBe(before)
})
