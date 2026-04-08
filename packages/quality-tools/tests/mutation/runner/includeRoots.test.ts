import { describe, expect, it } from 'vitest';
import {
  baseTestRoots,
  directoryIncludes,
  packageIncludes
} from '../../../src/mutation/runner/includeRoots';

describe('baseTestRoots', () => {
  it('returns both supported package test roots', () => {
    expect(baseTestRoots('extension')).toEqual([
      'packages/extension/tests',
      'packages/extension/__tests__'
    ]);
  });
});

describe('packageIncludes', () => {
  it('expands package-wide test glob patterns', () => {
    expect(packageIncludes('extension')).toEqual([
      'packages/extension/tests/**/*.test.ts',
      'packages/extension/tests/**/*.test.tsx',
      'packages/extension/__tests__/**/*.test.ts',
      'packages/extension/__tests__/**/*.test.tsx'
    ]);
  });
});

describe('directoryIncludes', () => {
  it('expands mirrored directory globs for both test roots', () => {
    expect(directoryIncludes('extension', 'core/views')).toEqual([
      'packages/extension/tests/core/views/**/*.test.ts',
      'packages/extension/tests/core/views/**/*.test.tsx',
      'packages/extension/__tests__/core/views/**/*.test.ts',
      'packages/extension/__tests__/core/views/**/*.test.tsx'
    ]);
  });

  it('normalizes webview component directories to the test tree', () => {
    expect(directoryIncludes('extension', 'webview/components/graph/runtime/use/graph')).toEqual([
      'packages/extension/tests/webview/graph/runtime/use/graph/**/*.test.ts',
      'packages/extension/tests/webview/graph/runtime/use/graph/**/*.test.tsx',
      'packages/extension/__tests__/webview/graph/runtime/use/graph/**/*.test.ts',
      'packages/extension/__tests__/webview/graph/runtime/use/graph/**/*.test.tsx'
    ]);
  });
});
