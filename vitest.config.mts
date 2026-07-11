import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom@27's CSS color parser (@asamuzakjp/css-color -> @csstools/css-calc)
    // ships ESM-only. Vitest's default "forks" pool loads test files via
    // require(), which chokes on that with ERR_REQUIRE_ESM. The "threads"
    // pool uses real ESM import() instead, which resolves it correctly.
    pool: 'threads',
    environment: 'node', // per-file `// @vitest-environment jsdom` pragma opts into jsdom only where needed
    globals: false,
  },
})