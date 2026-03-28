import { describe, expect, it } from 'vitest';
import { packagePathParts, relativeTo, toPosix } from '../../../src/shared/util/pathUtils';

describe('pathUtils', () => {
  it('converts backslashes to posix separators', () => {
    expect(toPosix('packages\\quality-tools\\src\\file.ts')).toBe('packages/quality-tools/src/file.ts');
  });

  it('returns posix relative paths', () => {
    expect(relativeTo('/repo', '/repo/packages/quality-tools/src/file.ts')).toBe(
      'packages/quality-tools/src/file.ts'
    );
  });

  it('extracts package metadata from package-relative paths', () => {
    expect(packagePathParts('packages/quality-tools/src/file.ts')).toEqual({
      packageName: 'quality-tools',
      packageRelativePath: 'src/file.ts'
    });
    expect(packagePathParts('docs/quality')).toEqual({});
  });

  it('rejects package-like paths without a package-relative segment', () => {
    expect(packagePathParts('packages')).toEqual({});
    expect(packagePathParts('packages/quality-tools')).toEqual({});
  });

  it('rejects non-package paths even when they are long enough', () => {
    expect(packagePathParts('docs/quality/src/file.ts')).toEqual({});
  });
});
