import { globSync } from 'glob';
import { describe, expect, it } from 'vitest';
import { resolvePackageToolGlobs } from '../../src/config/quality';
import { REPO_ROOT } from '../../src/shared/resolve/repoRoot';

describe('repo mutation excludes', () => {
  it('only includes exclude globs that match files in this repo', () => {
    const packageNames = [
      'extension',
      'quality-tools',
      'plugin-api',
      'plugin-csharp',
      'plugin-godot',
      'plugin-markdown',
      'plugin-python',
      'plugin-typescript'
    ];

    const misses = packageNames.flatMap((packageName) => {
      const { exclude } = resolvePackageToolGlobs(REPO_ROOT, packageName, 'mutation');

      return exclude.flatMap((pattern) => (
        globSync(pattern, {
          cwd: REPO_ROOT,
          dot: true,
          nodir: true,
          posix: true
        }).length === 0
          ? [`${packageName}:${pattern}`]
          : []
      ));
    });

    expect(misses).toEqual([]);
  });
});
