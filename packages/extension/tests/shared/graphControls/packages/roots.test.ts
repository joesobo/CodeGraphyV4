import { describe, expect, it } from 'vitest';
import { collectWorkspacePackageRoots } from '../../../../src/shared/graphControls/packages/roots';

describe('shared/graphControls/packages/roots', () => {
  it('collects root and nested workspace package roots from package.json files', () => {
    expect(collectWorkspacePackageRoots([
      { id: 'package.json', label: 'package.json', color: '#111111', nodeType: 'file' },
      { id: 'packages/extension/package.json', label: 'package.json', color: '#222222', nodeType: 'file' },
      { id: 'packages/extension/src/index.ts', label: 'index.ts', color: '#333333', nodeType: 'file' },
      { id: 'README.md', label: 'README.md', color: '#444444', nodeType: 'file' },
    ])).toEqual(new Set(['.', 'packages/extension']));
  });
});
