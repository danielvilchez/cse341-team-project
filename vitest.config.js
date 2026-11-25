import { defineConfig } from 'vitest/config';

process.env.SESSION_SECRET = 'test-session-secret';

export default defineConfig({
  test: {
    globalSetup: ['./tests/global-setup.js'],
    setupFiles: ['./tests/setup.js'],
    fileParallelism: false,
    hookTimeout: 120_000
  }
});
