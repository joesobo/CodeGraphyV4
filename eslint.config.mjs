import { defineConfig, globalIgnores } from 'eslint/config';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import mochaPlugin from 'eslint-plugin-mocha';
import playwrightPlugin from 'eslint-plugin-playwright';
import globals from 'globals';

export default defineConfig(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'id-length': ['error', { min: 2, exceptions: ['i', 'j', 'x', 'y', 'z', 'w', 'h', '_', 'e', 'n', 'r', 'g', 'b', 's'] }],
    },
  },
  {
    files: [
      'playwright.config.ts',
      'test-fixtures/**/*.ts',
      'packages/**/tests/**/*.{ts,tsx}',
      'packages/**/__tests__/**/*.{ts,tsx}',
      'packages/**/vite.config.ts',
      'packages/**/vitest*.config.ts',
      'packages/plugin-typescript/examples/**/*.{ts,tsx}',
    ],
    ...tseslint.configs.disableTypeChecked,
  },
  // Mocha rules for e2e test files
  {
    files: ['packages/extension/src/e2e/**/*.ts'],
    plugins: { mocha: mochaPlugin },
    languageOptions: {
      globals: {
        ...globals.node,
        ...mochaPlugin.configs.recommended.languageOptions.globals,
      },
    },
    rules: {
      ...mochaPlugin.configs.recommended.rules,
      'mocha/no-mocha-arrows': 'error',
      'mocha/no-identical-title': 'error',
      'mocha/no-exclusive-tests': 'error',
      'mocha/no-pending-tests': 'warn',
      // e2e files group related suites together — allow multiple per file
      'mocha/max-top-level-suites': 'off',
    },
  },
  // Playwright rules for browser smoke/e2e tests.
  {
    files: ['tests/playwright/**/*.ts'],
    ...playwrightPlugin.configs['flat/recommended'],
    rules: {
      ...playwrightPlugin.configs['flat/recommended'].rules,
    },
  },
  globalIgnores([
    'dist/**',
    'dist-e2e/**',
    'node_modules/**',
    'coverage/**',
    '.turbo/**',
    '.worktrees/**',
    'playwright-report/**',
    'test-results/**',
    'blob-report/**',
  ])
);
