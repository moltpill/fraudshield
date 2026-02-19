import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Run test files sequentially to avoid database race conditions
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    // Workspace projects
    projects: [
      {
        // Root-level tests (workspace validation, etc.)
        test: {
          name: 'root',
          include: ['tests/**/*.test.ts'],
        },
      },
      'packages/shared',
      'packages/api',
      'packages/sdk',
      'packages/dashboard',
      'packages/admin',
    ],
  },
})
