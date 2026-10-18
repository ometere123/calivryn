import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Standalone browser-harness Vite server: e2e tests explicitly intercept API calls.
// No Cloudflare credentials or live AI usage is required for this CI test server.
// Live Cloudflare inference is a separate release gate, never inferred from mocked e2e.
export default defineConfig({ plugins: [react(), tailwindcss()] });
