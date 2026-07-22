import { defineConfig, globalIgnores } from 'eslint/config';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';
import mochaPlugin from 'eslint-plugin-mocha';
import playwrightPlugin from 'eslint-plugin-playwright';
import importPlugin from 'eslint-plugin-import-x';
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
    rules: {
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'id-length': ['error', { min: 2, exceptions: ['i', 'j', 'x', 'y', 'z', 'w', 'h', '_', 'e', 'n', 'r', 'g', 'b', 's'] }],
    },
  },
  {
    files: ['packages/extension/**/*.{ts,tsx}', 'apps/web/**/*.{ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: {
      react: {
        version: '18.3',
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      '@typescript-eslint/member-ordering': [
        'error',
        {
          interfaces: {
            memberTypes: 'never',
            optionalityOrder: 'required-first',
            order: 'as-written',
          },
          typeLiterals: {
            memberTypes: 'never',
            optionalityOrder: 'required-first',
            order: 'as-written',
          },
        },
      ],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: {
      'import-x': importPlugin,
    },
    rules: {
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [{ pattern: '@/**', group: 'internal', position: 'after' }],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'never',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
  {
    files: [
      'examples/**/*.{ts,tsx}',
      'apps/**/*.test.{ts,tsx}',
      'apps/**/tests/**/*.{ts,tsx}',
      'apps/**/vitest*.config.ts',
      '.codegraphy/particles/**/*.ts',
      'packages/**/playwright*.config.ts',
      'packages/**/test-fixtures/**/*.ts',
      'packages/**/tests/**/*.{ts,tsx}',
      'packages/**/__tests__/**/*.{ts,tsx}',
      'packages/**/vite.config.ts',
      'packages/**/vitest*.config.ts',
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
    files: ['packages/**/tests/playwright*/**/*.ts'],
    ...playwrightPlugin.configs['flat/recommended'],
    rules: {
      ...playwrightPlugin.configs['flat/recommended'].rules,
    },
  },
  globalIgnores([
    'dist/**',
    'dist-e2e/**',
    'node_modules/**',
    // AssemblyScript uses decorators and numeric types that the TypeScript ESLint parser does not support.
    'packages/graph-renderer/src/physics/wasm/assembly/**',
    'coverage/**',
    '.turbo/**',
    '.worktrees/**',
    'apps/**/.next/**',
    'apps/**/out/**',
    'playwright-report/**',
    'test-results/**',
    'blob-report/**',
  ])
);
