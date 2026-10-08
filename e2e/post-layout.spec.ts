import { expect, test, VIEWPORTS } from './fixtures'
import { backButton, openPost } from './post-support'
import { cardLinks, expectNear, measure, serveOutsideContentMap, SIZES, summaryStart } from './support'

// The content column of the post is the one measure of the post matrix that
// has its own tolerance: 877 +- 2, not the +-1 of the other lines.
const COLUMN_TOLERANCE = 2

test('M5 the post has a 877 content column at 1440, a Back 48 high at 1440 and 32 at 375, and three cards under Latest articles', async ({
  page,
  posts: snapshot,
}) => {
  // Posts outside the content map: the post shows the body of the API (K7 of P4).
  const posts = await serveOutsideContentMap(page, snapshot)
  const post = posts[1]
  const backHeight = { mobile: 32, desktop: 48 }

  for (const size of SIZES) {
    await openPost(page, post, VIEWPORTS[size])

    const back = await measure(backButton(page), `${size}: Back`)
    expectNear(back.height, backHeight[size], `${size}: Back height`)

    await expect(
      page.getByText('Latest articles', { exact: true }),
      `${size}: the Latest articles heading`,
    ).toBeVisible()
    await expect(
      cardLinks(page, posts),
      `${size}: cards under Latest articles`,
    ).toHaveCount(3)

    if (size === 'desktop') {
      // The text of the post fills its column, so the first paragraph is the
      // column's width. The first match in the document is the post's own
      // paragraph: the cards, which repeat the start of the content in their
      // summaries, come after it.
      const paragraph = page.locator('p', { hasText: summaryStart(post) }).first()
      const column = await measure(paragraph, `${size}: the first paragraph of the post`)
      const message = `${size}: content column expected 877 (+-${COLUMN_TOLERANCE}), got ${column.width}`
      expect(column.width, message).toBeGreaterThanOrEqual(877 - COLUMN_TOLERANCE)
      expect(column.width, message).toBeLessThanOrEqual(877 + COLUMN_TOLERANCE)
    }
  }
})
