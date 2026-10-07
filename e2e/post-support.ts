import type { Locator, Page } from '@playwright/test'
import { expect, type ApiPost } from './fixtures'

// Helpers shared by the post oracles (E1 to E5 and M5). Like support.ts, no
// design number lives here: each number stays in the spec of its matrix line.

/** The h1 of a post page: the post title is its name. */
export const postHeading = (page: Page, post: ApiPost): Locator =>
  page.getByRole('heading', { level: 1, name: post.title })

/** The Back control of the post page: a button named Back. */
export const backButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Back', exact: true })

/**
 * Opens the page of a post in a fresh navigation, at a viewport, and waits for
 * its title. Until the post page exists, this is the assertion that fails, so
 * no spec dies on a timeout inside a click.
 */
export async function openPost(
  page: Page,
  post: ApiPost,
  viewport: { width: number; height: number },
): Promise<void> {
  await page.setViewportSize(viewport)
  await page.goto(`/posts/${post.id}`)
  await expect(
    postHeading(page, post),
    `the post "${post.title}" at ${viewport.width}px`,
  ).toBeVisible()
}
