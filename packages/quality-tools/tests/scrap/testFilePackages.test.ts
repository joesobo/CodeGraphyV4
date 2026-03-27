import { describe, expect, it } from 'vitest';
import { packageNamesForTarget } from '../../src/scrap/testFilePackages';
import { REPO_ROOT } from '../../src/shared/repoRoot';
import { resolveQualityTarget } from '../../src/shared/resolveTarget';

describe('packageNamesForTarget', () => {
  it('returns all workspace package names for repo targets', () => {
    const packageNames = packageNamesForTarget(resolveQualityTarget(REPO_ROOT), REPO_ROOT);
    expect(packageNames).toContain('quality-tools');
    expect(packageNames).toContain('extension');
  });

  it('returns the package name for package and nested package targets', () => {
    expect(packageNamesForTarget(resolveQualityTarget(REPO_ROOT, 'quality-tools/'), REPO_ROOT)).toEqual(['quality-tools']);
    expect(packageNamesForTarget(
      resolveQualityTarget(REPO_ROOT, 'packages/quality-tools/tests'),
      REPO_ROOT
    )).toEqual(['quality-tools']);
  });

  it('returns an empty list for non-package targets', () => {
    expect(packageNamesForTarget(resolveQualityTarget(REPO_ROOT, 'docs/quality'), REPO_ROOT)).toEqual([]);
  });
});
