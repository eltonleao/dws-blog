import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

// Built on top of vite.config.ts, so the tests run the same compiled code as the app.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      // The Playwright specs in e2e/ are not Vitest tests.
      include: ['src/**/*.test.{ts,tsx}'],
    },
  }),
)
