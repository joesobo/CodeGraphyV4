import { describe, expect, it } from 'vitest';
import { createWorkspacePackageNodes } from '../../../src/shared/graphControls/packages/nodes';
import { collectWorkspacePackageRoots } from '../../../src/shared/graphControls/packages/roots';
import { WORKSPACE_PACKAGE_NODE_ID_PREFIX } from '../../../src/shared/graphControls/packages/workspace';

describe('shared/graphControls/packages', () => {
  it('collects root and nested workspace package roots from package.json files', () => {
    expect(collectWorkspacePackageRoots([
      { id: 'package.json', label: 'package.json', color: '#111111', nodeType: 'file' },
      { id: 'packages/extension/package.json', label: 'package.json', color: '#222222', nodeType: 'file' },
      { id: 'packages/extension/src/index.ts', label: 'index.ts', color: '#333333', nodeType: 'file' },
      { id: 'README.md', label: 'README.md', color: '#444444', nodeType: 'file' },
    ])).toEqual(new Set(['.', 'packages/extension']));
  });

  it('creates package nodes with stable ids and package styling', () => {
    expect(createWorkspacePackageNodes(new Set(['.', 'packages/extension']), '#F59E0B')).toEqual([
      {
        id: `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}.`,
        label: 'workspace',
        color: '#F59E0B',
        nodeType: 'package',
        shape2D: 'hexagon',
      },
      {
        id: `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}packages/extension`,
        label: 'extension',
        color: '#F59E0B',
        nodeType: 'package',
        shape2D: 'hexagon',
      },
    ]);
  });

});
