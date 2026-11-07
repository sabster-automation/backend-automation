import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 15000,
    fileParallelism: false,
    include: ['tests/api/**/*.test.ts', 'tests/rabbitmq/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './reports/junit-report.xml',
    },
    globalSetup: ['./tests/globalSetup.ts'],
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, './src/core'),
      '@services': path.resolve(__dirname, './src/services'),
      '@config': path.resolve(__dirname, './src/config'),
      '@utils': path.resolve(__dirname, './src/core/utils'),
      '@pages': path.resolve(__dirname, './src/pages'),
    },
  },
});
