import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

// Built on top of vite.config.ts, so the tests run the same compiled code as the app.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts', './src/test/asyncTimeout.ts'],
      // Three times the five-second wait of findBy* queries, so a test that does
      // not find what it waits for fails on that query and not on the clock.
      testTimeout: 15000,
      hookTimeout: 30000,
      // The Playwright specs in e2e/ are not Vitest tests.
      include: ['src/**/*.test.{ts,tsx}'],
    },
  }),
)
