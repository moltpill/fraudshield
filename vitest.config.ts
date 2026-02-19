import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Run test files sequentially to avoid database race conditions
    fileParallelism: false,
  },
})
