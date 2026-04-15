import { describe, expect, it } from 'vitest';
import { WORKSPACE_PACKAGE_NODE_ID_PREFIX } from '../../../../src/shared/graphControls/packages/shared';
import { createWorkspacePackageNodes } from '../../../../src/shared/graphControls/packages/nodes';

describe('shared/graphControls/packages/nodes', () => {
  it('creates package nodes with stable ids and package styling', () => {
    expect(createWorkspacePackageNodes(new Set(['.', 'packages/extension']), '#F59E0B')).toEqual([
      {
        id: `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}.`,
        label: 'workspace',
        color: '#F59E0B',
        nodeType: 'package',
        shape2D: 'hexagon',
        shape3D: 'cube',
      },
      {
        id: `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}packages/extension`,
        label: 'extension',
        color: '#F59E0B',
        nodeType: 'package',
        shape2D: 'hexagon',
        shape3D: 'cube',
      },
    ]);
  });
});
