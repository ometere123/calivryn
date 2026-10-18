import { defineConfig } from 'vitest/config';

// Unit tests run in plain Node, independent of Cloudflare remote AI bindings.
// Worker model calls in unit tests are explicit spies, not live inference evidence.
export default defineConfig({
  test: {
    include: ['tests/*.test.ts'],
    environment: 'node',
  },
});
