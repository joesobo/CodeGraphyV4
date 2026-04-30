import { describe, expect, it } from 'vitest';
import { WORKSPACE_PACKAGE_NODE_ID_PREFIX } from '../../../../src/shared/graphControls/packages/workspace';
import { buildWorkspacePackageEdges } from '../../../../src/shared/graphControls/packages/edges';

describe('shared/graphControls/packages/edges', () => {
  it('builds nests edges from the nearest workspace package to each visible file', () => {
    expect(buildWorkspacePackageEdges(
      new Set(['.', 'packages/extension']),
      [
        { id: 'package.json', label: 'package.json', color: '#111111', nodeType: 'file' },
        { id: 'packages/extension/package.json', label: 'package.json', color: '#222222', nodeType: 'file' },
        { id: 'packages/extension/src/index.ts', label: 'index.ts', color: '#333333', nodeType: 'file' },
        { id: 'packages/plugin-api/src/api.ts', label: 'api.ts', color: '#444444', nodeType: 'file' },
      ],
    )).toEqual([
      {
        id: `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}.->package.json#nests`,
        from: `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}.`,
        to: 'package.json',
        kind: 'nests',
        sources: [],
      },
      {
        id: `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}packages/extension->packages/extension/package.json#nests`,
        from: `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}packages/extension`,
        to: 'packages/extension/package.json',
        kind: 'nests',
        sources: [],
      },
      {
        id: `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}packages/extension->packages/extension/src/index.ts#nests`,
        from: `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}packages/extension`,
        to: 'packages/extension/src/index.ts',
        kind: 'nests',
        sources: [],
      },
      {
        id: `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}.->packages/plugin-api/src/api.ts#nests`,
        from: `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}.`,
        to: 'packages/plugin-api/src/api.ts',
        kind: 'nests',
        sources: [],
      },
    ]);
  });

  it('skips non-file nodes and files that do not resolve to a workspace package root', () => {
    expect(buildWorkspacePackageEdges(
      new Set(['packages/extension']),
      [
        { id: 'packages/extension', label: 'packages/extension', color: '#111111', nodeType: 'folder' },
        { id: 'packages/plugin-api/src/api.ts', label: 'api.ts', color: '#222222', nodeType: 'file' },
        { id: 'packages/extension/src/index.ts', label: 'index.ts', color: '#333333', nodeType: 'file' },
      ],
    )).toEqual([
      {
        id: `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}packages/extension->packages/extension/src/index.ts#nests`,
        from: `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}packages/extension`,
        to: 'packages/extension/src/index.ts',
        kind: 'nests',
        sources: [],
      },
    ]);
  });
});
