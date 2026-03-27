import { describe, expect, it } from 'vitest';
import { discoverTestFiles } from '../../src/scrap/testFiles';
import { REPO_ROOT } from '../../src/shared/repoRoot';
import { resolveQualityTarget } from '../../src/shared/resolveTarget';

describe('discoverTestFiles', () => {
  it('finds package test files for a package target', () => {
    const files = discoverTestFiles(resolveQualityTarget(REPO_ROOT, 'quality-tools/'));
    expect(files.some((file) => file.endsWith('packages/quality-tools/tests/shared/resolveTarget.test.ts'))).toBe(true);
    expect(files[0]?.startsWith(REPO_ROOT)).toBe(true);
  });

  it('returns only the explicit test file for direct file targets', () => {
    const files = discoverTestFiles(
      resolveQualityTarget(REPO_ROOT, 'packages/quality-tools/tests/scrap/metrics.basics.test.ts')
    );

    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/metrics\.basics\.test\.ts$/);
  });

  it('returns an empty list for non-test files', () => {
    const files = discoverTestFiles(
      resolveQualityTarget(REPO_ROOT, 'packages/quality-tools/src/scrap/metrics.ts')
    );

    expect(files).toEqual([]);
  });

  it('returns an empty list for non-package targets', () => {
    const files = discoverTestFiles(resolveQualityTarget(REPO_ROOT, 'docs/quality'));
    expect(files).toEqual([]);
  });

  it('filters package results down to the selected directory scope', () => {
    const files = discoverTestFiles(
      resolveQualityTarget(REPO_ROOT, 'packages/quality-tools/tests/scrap')
    );

    expect(files).not.toEqual([]);
    expect(files.every((file) => file.includes('/packages/quality-tools/tests/scrap/'))).toBe(true);
    expect(files.some((file) => file.includes('/packages/quality-tools/tests/shared/'))).toBe(false);
  });
});
