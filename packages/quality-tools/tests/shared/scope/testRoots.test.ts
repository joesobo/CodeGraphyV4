import { mkdtempSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { existingTestRoots, isTestPath } from './testRootsSupport';

describe('isTestPath', () => {
  it('recognizes test roots and nested test paths', () => {
    expect(isTestPath('tests')).toBe(true);
    expect(isTestPath('tests/unit/sample.test.ts')).toBe(true);
    expect(isTestPath('src/file.ts')).toBe(false);
    expect(isTestPath(undefined)).toBe(false);
  });
});

describe('existingTestRoots', () => {
  it('returns package-relative roots that exist', () => {
    const packageRoot = mkdtempSync(join(tmpdir(), 'quality-tools-test-roots-'));
    mkdirSync(join(packageRoot, 'tests'));

    expect(existingTestRoots(packageRoot, 'example')).toEqual([
      'packages/example/tests'
    ]);
  });
});
