import babel from '@rolldown/plugin-babel'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // React Compiler memoizes components at build time: the code has no
  // hand-written useMemo, useCallback or memo.
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
})
