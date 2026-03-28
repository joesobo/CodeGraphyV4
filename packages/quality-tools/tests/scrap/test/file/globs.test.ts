import { beforeEach, describe, expect, it, vi } from 'vitest';

const globSync = vi.fn(() => [
  '/repo/packages/quality-tools/tests/b.test.ts',
  '/repo/packages/quality-tools/tests/a.test.ts',
  '/repo/packages/quality-tools/tests/a.test.ts'
]);
const resolvePackageToolGlobs = vi.fn(() => ({
  include: ['packages/quality-tools/tests/**/*.test.ts'],
  exclude: ['packages/quality-tools/tests/helpers/**']
}));

vi.mock('glob', () => ({
  globSync
}));

vi.mock('../../../../src/config/quality', () => ({
  resolvePackageToolGlobs
}));

describe('discoverPackageTestFiles', () => {
  beforeEach(() => {
    globSync.mockClear();
    resolvePackageToolGlobs.mockClear();
  });

  it('uses the configured include and exclude globs with absolute paths', async () => {
    const { discoverPackageTestFiles } = await import('../../../../src/scrap/test/fileGlobs');
    expect(discoverPackageTestFiles('quality-tools', '/repo')).toEqual([
      '/repo/packages/quality-tools/tests/a.test.ts',
      '/repo/packages/quality-tools/tests/b.test.ts'
    ]);
    expect(resolvePackageToolGlobs).toHaveBeenCalledWith('/repo', 'quality-tools', 'scrap');
    expect(globSync).toHaveBeenCalledWith('packages/quality-tools/tests/**/*.test.ts', {
      absolute: true,
      cwd: '/repo',
      ignore: ['packages/quality-tools/tests/helpers/**']
    });
  });
});
