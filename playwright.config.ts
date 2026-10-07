import { defineConfig, devices } from '@playwright/test'

const PORT = 4173

// With E2E_BASE_URL set (a deployed URL, or a preview someone else started),
// the specs run against that host and no server is started. The API fixture
// is served by page.route, so any host works.
const EXTERNAL_BASE_URL = process.env.E2E_BASE_URL || undefined

export default defineConfig({
  testDir: './e2e',
  testMatch: '*.spec.ts',
  // The specs measure layout and scroll, so they run one at a time.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  // On CI the HTML report is what the failure artifact uploads.
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: EXTERNAL_BASE_URL ?? `http://localhost:${PORT}`,
    headless: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  ...(EXTERNAL_BASE_URL
    ? {}
    : {
        webServer: {
          // The specs run against the production build, never against a stale one.
          command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
          url: `http://localhost:${PORT}`,
          reuseExistingServer: false,
          timeout: 180_000,
        },
      }),
})
