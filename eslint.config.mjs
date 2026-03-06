import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import mochaPlugin from 'eslint-plugin-mocha';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
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
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  // Mocha rules for e2e test files
  {
    files: ['src/e2e/**/*.ts'],
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
  {
    ignores: ['dist/**', 'dist-e2e/**', 'node_modules/**'],
  }
);
