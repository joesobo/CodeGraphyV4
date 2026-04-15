import { describe, expect, it } from 'vitest';
import {
  baseTestRoots,
  directoryIncludes,
  packageIncludes
} from '../../../src/mutation/runner/includeRoots';

describe('baseTestRoots', () => {
  it('returns the package test root', () => {
    expect(baseTestRoots('extension')).toEqual([
      'packages/extension/tests'
    ]);
  });
});

describe('packageIncludes', () => {
  it('expands package-wide test glob patterns', () => {
    expect(packageIncludes('extension')).toEqual([
      'packages/extension/tests/**/*.test.ts',
      'packages/extension/tests/**/*.test.tsx',
    ]);
  });
});

describe('directoryIncludes', () => {
  it('expands mirrored directory globs', () => {
    expect(directoryIncludes('extension', 'core/views')).toEqual([
      'packages/extension/tests/core/views/**/*.test.ts',
      'packages/extension/tests/core/views/**/*.test.tsx',
    ]);
  });

  it('normalizes webview component directories to the test tree', () => {
    expect(directoryIncludes('extension', 'webview/components/graph/runtime/use/graph')).toEqual([
      'packages/extension/tests/webview/graph/runtime/use/graph/**/*.test.ts',
      'packages/extension/tests/webview/graph/runtime/use/graph/**/*.test.tsx',
    ]);
  });
});
