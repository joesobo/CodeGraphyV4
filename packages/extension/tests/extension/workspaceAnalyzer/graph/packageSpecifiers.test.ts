import { describe, expect, it } from 'vitest';
import {
  getExternalPackageName,
  getExternalPackageNodeId,
  isExternalPackageSpecifier,
} from '../../../../src/extension/workspaceAnalyzer/graph/packageSpecifiers';

describe('workspaceAnalyzer/graph/packageSpecifiers', () => {
  it('recognizes bare package specifiers', () => {
    expect(isExternalPackageSpecifier('react')).toBe(true);
    expect(isExternalPackageSpecifier('@types/node')).toBe(true);
    expect(isExternalPackageSpecifier('node:fs/promises')).toBe(true);
  });

  it('ignores non-package specifiers', () => {
    expect(isExternalPackageSpecifier('./utils')).toBe(false);
    expect(isExternalPackageSpecifier('../helpers')).toBe(false);
    expect(isExternalPackageSpecifier('/usr/local/lib')).toBe(false);
    expect(isExternalPackageSpecifier('[[Note Name]]')).toBe(false);
  });

  it('extracts stable external package names from bare imports', () => {
    expect(getExternalPackageName('fs')).toBe('fs');
    expect(getExternalPackageName('node:fs/promises')).toBe('fs');
    expect(getExternalPackageName('lodash/merge')).toBe('lodash');
    expect(getExternalPackageName('@scope/pkg/subpath')).toBe('@scope/pkg');
  });

  it('creates synthetic package node ids', () => {
    expect(getExternalPackageNodeId('react')).toBe('pkg:react');
    expect(getExternalPackageNodeId('@scope/pkg/subpath')).toBe('pkg:@scope/pkg');
    expect(getExternalPackageNodeId('./local')).toBeNull();
  });
});
