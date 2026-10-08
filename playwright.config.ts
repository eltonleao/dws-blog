import { defineConfig, devices } from '@playwright/test'

const PORT = 4173

// With E2E_BASE_URL set (a preview someone else started), the specs run
// against that server and none is started. It has to be a local address:
// the fixture in e2e/fixtures/index.ts refuses every request outside localhost.
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
          // The build points the comments at an address the specs answer
          // themselves (e2e/comments-support.ts); a variable set in the shell
          // wins over any .env file, so the real project is never reached.
          command: `VITE_SUPABASE_URL=https://e2e.supabase.test VITE_SUPABASE_ANON_KEY=e2e-anon-key npm run build && npm run preview -- --port ${PORT} --strictPort`,
          url: `http://localhost:${PORT}`,
          reuseExistingServer: false,
          timeout: 180_000,
        },
      }),
})
