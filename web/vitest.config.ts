import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'src/lib/utils/crypto.ts',
        'src/lib/auth/rbac.ts',
        'src/lib/auth/session.ts',
        'src/lib/contracts/**/*.ts',
        'src/lib/services/catalog.service.ts',
        'src/lib/services/billing.service.ts',
        'src/lib/services/installation.service.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
