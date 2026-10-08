import { expect, test, VIEWPORTS } from './fixtures'

test('A3 from a filtered list to a post to its author and Back twice returns to the post and to the same list', async ({
  page,
  posts,
}) => {
  const post = posts.find((candidate) => candidate.categories.some((category) => category.name === 'Technology'))
  if (!post) throw new Error('the snapshot has no Technology post')
  const listPath = '/?category=Technology'
  const inTechnology = posts.filter((candidate) => candidate.categories.some((category) => category.name === 'Technology'))

  await page.setViewportSize(VIEWPORTS.desktop)
  await page.goto(listPath)
  const cards = page.locator('main a[href^="/posts/"]')
  await expect(cards, 'the cards of the filtered list').toHaveCount(inTechnology.length)

  await page.getByRole('link', { name: post.title, exact: true }).first().click()
  await expect(page).toHaveURL(new RegExp(`/posts/${post.id}$`))
  await expect(page.getByRole('heading', { level: 1, name: post.title })).toBeVisible()

  const authorLink = page.locator('main').getByRole('link', { name: post.author.name, exact: true })
  await expect(authorLink, 'the author name is a link on the post page').toHaveCount(1)
  await authorLink.click()
  await expect(page).toHaveURL(new RegExp(`/authors/${post.author.id}$`))
  await expect(page.getByRole('heading', { level: 1, name: post.author.name })).toBeVisible()
  const byAuthor = posts.filter((candidate) => candidate.author.id === post.author.id)
  await expect(cards, 'the cards of the author page').toHaveCount(byAuthor.length)

  await page.goBack()
  await expect(page, 'Back once returns to the post').toHaveURL(new RegExp(`/posts/${post.id}$`))
  await expect(page.getByRole('heading', { level: 1, name: post.title })).toBeVisible()

  await page.goBack()
  await expect(page, 'Back twice returns to the list with its filter').toHaveURL(new RegExp(`${listPath.replace('?', '\\?')}$`))
  await expect(cards, 'the same cards in the list').toHaveCount(inTechnology.length)
  await expect(page.getByRole('button', { name: 'Technology', exact: true })).toHaveAttribute('aria-pressed', 'true')
})
