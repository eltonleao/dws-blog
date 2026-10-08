import { expect, test } from './fixtures'

const ATOM_NAMESPACE = 'http://www.w3.org/2005/Atom'

for (const locale of ['en', 'es'] as const) {
  test(`A6 /feed.${locale}.xml is served as a file, an Atom feed with the 26 posts and not the index page`, async ({
    request,
    posts,
  }) => {
    const response = await request.get(`/feed.${locale}.xml`)

    expect(response.status()).toBe(200)
    const body = await response.text()
    expect(body, 'the body is the feed and not index.html').toContain('<feed')
    expect(body.toLowerCase()).not.toContain('<!doctype html')
    expect(body).toContain(ATOM_NAMESPACE)
    expect(body.match(/<entry[\s>]/g) ?? [], 'one entry per post').toHaveLength(posts.length)
  })
}

test('A6 the index page announces the two feeds with alternate links that carry the language', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  const links = await page.locator('head link[rel="alternate"][type="application/atom+xml"]').evaluateAll((nodes) =>
    nodes.map((node) => ({
      hreflang: node.getAttribute('hreflang'),
      href: new URL(node.getAttribute('href') ?? '', location.href).pathname,
    })),
  )
  expect(links.sort((a, b) => String(a.hreflang).localeCompare(String(b.hreflang)))).toEqual([
    { hreflang: 'en', href: '/feed.en.xml' },
    { hreflang: 'es', href: '/feed.es.xml' },
  ])
})
