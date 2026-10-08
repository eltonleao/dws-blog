import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { en } from '../src/i18n/messages/en'
import { es } from '../src/i18n/messages/es'
import { mockSupabase, test } from './comments-support'
import { expect, VIEWPORTS } from './fixtures'

const dictionaries: Record<'en' | 'es', Record<string, string>> = { en, es }
const KEY = 'dws-blog:locale'

async function blockingViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  return violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .flatMap((violation) =>
      violation.nodes.map((node) => ({ rule: violation.id, selector: node.target.join(' ') })),
    )
}

test('S12 with the database unreachable the post stays readable, the message offers Try again, and the retry loads', async ({
  page,
  post,
}) => {
  const project = await mockSupabase(page, { comments: [], readStatus: 0 })
  await page.setViewportSize(VIEWPORTS.desktop)
  await page.goto(`/posts/${post.id}`)

  await expect(page.getByRole('heading', { level: 1, name: post.title })).toBeVisible()
  const alert = page.getByRole('alert').filter({ hasText: 'Comments are unavailable right now' })
  await expect(alert).toBeVisible()

  project.comments.push({
    id: 'c1',
    post_id: post.id,
    user_id: '00000000-0000-4000-8000-0000000000aa',
    display_name: 'Visitor 4242',
    body: 'Here after the retry',
    created_at: '2026-10-02T10:00:00.000Z',
  })
  project.readStatus = 200
  await alert.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByText('Here after the retry')).toBeVisible()
  await expect(alert).toBeHidden()
  await expect(page.getByRole('heading', { level: 1, name: post.title })).toBeVisible()
})

test('S19 the Supabase client stays out of the main chunk and the section is only requested on a post', async ({
  page,
  post,
}) => {
  await mockSupabase(page)
  const scripts: { url: string; body: string }[] = []
  page.on('response', async (response) => {
    if (response.request().resourceType() !== 'script') return
    scripts.push({ url: response.url(), body: await response.text().catch(() => '') })
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.waitForLoadState('networkidle')
  expect(scripts.length, 'the list loaded scripts').toBeGreaterThan(0)
  expect(
    scripts.filter((script) => /comments|supabase/i.test(script.url)).map((script) => script.url),
    'scripts of the comments on the list page',
  ).toEqual([])
  expect(
    scripts.filter((script) => /GoTrueClient|PostgrestClient/.test(script.body)).map((script) => script.url),
    'scripts that carry the Supabase client on the list page',
  ).toEqual([])
  const onList = scripts.length

  await page.goto(`/posts/${post.id}`)
  await expect(page.getByRole('heading', { level: 2 }).filter({ hasText: /comment/i })).toBeVisible()
  expect(
    scripts.slice(onList).some((script) => /CommentsSection/i.test(script.url)),
    'the post asks for the chunk of the comments section',
  ).toBe(true)

  const assets = resolve(process.cwd(), 'dist/assets')
  const mains = readdirSync(assets).filter((file) => /^index-.*\.js$/.test(file))
  expect(mains.length, 'the main chunk is in dist/assets').toBeGreaterThan(0)
  for (const file of mains) {
    expect(readFileSync(resolve(assets, file), 'utf8'), `${file} has no @supabase`).not.toContain('@supabase')
  }
})

for (const locale of ['en', 'es'] as const) {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    test(`S22 the post with comments has no serious accessibility violation in ${locale} at ${viewport.width}, the error is an alert and the focus returns to the field after sending`, async ({
      page,
      post,
    }) => {
      const t = dictionaries[locale]
      const project = await mockSupabase(page, {
        comments: [
          {
            id: 'c1',
            post_id: post.id,
            user_id: '00000000-0000-4000-8000-0000000000aa',
            display_name: 'Visitor 1111',
            body: 'A comment that was already there',
            created_at: '2026-10-02T10:00:00.000Z',
          },
        ],
        readStatus: 200,
      })
      await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, locale])
      await page.setViewportSize(viewport)

      await page.goto(`/posts/${post.id}`)
      await expect(page.getByText('A comment that was already there')).toBeVisible()
      expect(await blockingViolations(page), `${name}: comments loaded`).toEqual([])

      const field = page.getByRole('textbox', { name: t['comments.label'] })
      await field.fill('Sent from the test')
      await page.getByRole('button', { name: t['comments.submit'] }).click()
      await expect(page.getByText('Sent from the test')).toBeVisible()
      await expect(field, 'the focus is back on the field after sending').toBeFocused()
      expect(await blockingViolations(page), `${name}: after sending`).toEqual([])

      project.readStatus = 503
      await page.reload()
      await expect(page.getByRole('alert').filter({ hasText: t['comments.unavailable'] })).toBeVisible()
      expect(await blockingViolations(page), `${name}: error state`).toEqual([])
    })
  }
}
