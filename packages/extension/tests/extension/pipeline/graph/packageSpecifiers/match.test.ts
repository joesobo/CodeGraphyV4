import { describe, expect, it } from 'vitest';
import { isExternalPackageSpecifier } from '../../../../../src/extension/pipeline/graph/packageSpecifiers/match';

describe('pipeline/graph/packageSpecifiers/match', () => {
  it('recognizes bare package specifiers, scoped packages, and builtins', () => {
    expect(isExternalPackageSpecifier('react')).toBe(true);
    expect(isExternalPackageSpecifier('react#subpath')).toBe(true);
    expect(isExternalPackageSpecifier('react/')).toBe(true);
    expect(isExternalPackageSpecifier('react.')).toBe(true);
    expect(isExternalPackageSpecifier('@types/node')).toBe(true);
    expect(isExternalPackageSpecifier('node:fs/promises')).toBe(true);
  });

  it('treats only valid node-prefixed builtins as external builtins', () => {
    expect(isExternalPackageSpecifier('node:')).toBe(false);
    expect(isExternalPackageSpecifier('node:/fs')).toBe(false);
    expect(isExternalPackageSpecifier('node:fs')).toBe(true);
    expect(isExternalPackageSpecifier('node:fs/promises')).toBe(true);
  });

  it('ignores local, absolute, internal, and other colon-based specifiers', () => {
    expect(isExternalPackageSpecifier('./utils')).toBe(false);
    expect(isExternalPackageSpecifier('../helpers')).toBe(false);
    expect(isExternalPackageSpecifier('/usr/local/lib')).toBe(false);
    expect(isExternalPackageSpecifier('#internal')).toBe(false);
    expect(isExternalPackageSpecifier('fs/node:')).toBe(false);
    expect(isExternalPackageSpecifier('fs:node')).toBe(false);
    expect(isExternalPackageSpecifier('builtin-node:fs')).toBe(false);
    expect(isExternalPackageSpecifier('nodeish/fs')).toBe(true);
  });

  it('rejects invalid leading characters even when the rest looks like a package', () => {
    expect(isExternalPackageSpecifier('.react')).toBe(false);
    expect(isExternalPackageSpecifier('/react')).toBe(false);
    expect(isExternalPackageSpecifier('#react')).toBe(false);
    expect(isExternalPackageSpecifier('[[Note Name]]')).toBe(false);
  });
});
