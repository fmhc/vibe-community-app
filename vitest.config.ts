import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    watch: false, // Disable watch mode by default
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'build/',
        'public/',
        '**/*.config.*',
        '**/*.test.*',
        '**/__tests__/**',
      ],
    },
    // setupFiles: ['./app/test-setup.ts'], // Removed to prevent dev server conflicts
    // Only include test files when running tests
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'build', 'public', 'app'],
  },
}); 