import { describe, expect, it } from 'vitest';
import {
  collectWorkspacePackageRoots,
  getNearestWorkspacePackageRoot,
} from '../../../../src/shared/graphControls/packages/roots';

describe('shared/graphControls/packages/roots', () => {
  it('collects root and nested workspace package roots from package.json files', () => {
    expect(collectWorkspacePackageRoots([
      { id: 'package.json', label: 'package.json', color: '#111111', nodeType: 'file' },
      { id: 'packages/extension/package.json', label: 'package.json', color: '#222222', nodeType: 'file' },
      { id: 'packages/extension/src/index.ts', label: 'index.ts', color: '#333333', nodeType: 'file' },
      { id: 'README.md', label: 'README.md', color: '#444444', nodeType: 'file' },
    ])).toEqual(new Set(['.', 'packages/extension']));
  });

  it('selects the deepest package containing a file', () => {
    expect(getNearestWorkspacePackageRoot(
      'packages/extension/src/index.ts',
      new Set(['.', 'packages', 'packages/extension']),
    )).toBe('packages/extension');
  });

  it('uses the workspace package for otherwise unmatched files', () => {
    expect(getNearestWorkspacePackageRoot('README.md', new Set(['.', 'packages/core'])))
      .toBe('.');
  });

  it('returns null outside every known package', () => {
    expect(getNearestWorkspacePackageRoot('docs/guide.md', new Set(['packages/core'])))
      .toBeNull();
  });
});
