import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts'],
    environment: 'node',
    environmentMatchGlobs: [
      ['lib/scanner/**/*.test.ts', 'happy-dom'],
      ['lib/guide/**/*.test.ts', 'happy-dom'],
    ],
  },
});
