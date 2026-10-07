import { expect, test, VIEWPORTS } from './fixtures'
import { openList, styleOf } from './support'

test('M6 the page uses Open Sans, the primary button is #D31450 with #8C1038 on hover, and the selected sidebar item has a #006C6E border', async ({
  page,
  posts,
}) => {
  const links = await openList(page, posts, VIEWPORTS.desktop)
  const apply = page.getByRole('button', { name: 'Apply filters' })
  const technology = page.getByRole('button', { name: 'Technology', exact: true })
  const science = page.getByRole('button', { name: 'Science', exact: true })

  // The font: the stack starts with Open Sans everywhere, buttons included.
  const targets = [
    ['body', page.locator('body')],
    ['card title', links.first()],
    ['Apply filters', apply],
  ] as const
  for (const [label, target] of targets) {
    const family = (await styleOf(target, ['font-family']))['font-family'].replace(/["']/g, '')
    expect(family, `${label}: font-family`).toMatch(/^Open Sans\b/)
  }
  // fonts.check is true when no face matches at all, so a loaded face is required too.
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready
    let loaded = 0
    document.fonts.forEach((face) => {
      if (face.family.replace(/["']/g, '') === 'Open Sans' && face.status === 'loaded') loaded += 1
    })
    return { checks: document.fonts.check('16px "Open Sans"'), loaded }
  })
  expect(fonts.checks, 'document.fonts.check for 16px "Open Sans"').toBe(true)
  expect(fonts.loaded, 'loaded Open Sans font faces').toBeGreaterThan(0)

  // The selected sidebar item has the Accent 1 Dark border; the others do not.
  await technology.click()
  await expect(technology, 'Technology is selected').toHaveAttribute('aria-pressed', 'true')
  await expect(technology, 'selected item border colour').toHaveCSS('border-top-color', 'rgb(0, 108, 110)')
  await expect(technology, 'selected item border style').not.toHaveCSS('border-top-style', 'none')
  await expect(technology, 'selected item border width').not.toHaveCSS('border-top-width', '0px')
  await expect(science, 'an unselected item border colour').not.toHaveCSS(
    'border-top-color',
    'rgb(0, 108, 110)',
  )

  // The primary button, at rest and on hover.
  await expect(apply, 'primary button background').toHaveCSS('background-color', 'rgb(211, 20, 80)')
  await apply.hover()
  await expect(apply, 'primary button background on hover').toHaveCSS(
    'background-color',
    'rgb(140, 16, 56)',
  )
})
