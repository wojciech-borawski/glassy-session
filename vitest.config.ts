import { defineConfig } from 'vitest/config'
import { pluginsOutsideWxt } from './vite.plugins.ts'

export default defineConfig({
  plugins: pluginsOutsideWxt(),
  test: {
    globals: true,
    environment: 'happy-dom',
    clearMocks: true,
    setupFiles: './scripts/setup-tests.ts'
  }
})
