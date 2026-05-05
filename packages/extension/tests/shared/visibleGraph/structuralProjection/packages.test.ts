import { describe, expect, it } from 'vitest';
import type { IGraphNode } from '../../../../src/shared/graph/contracts';
import { WORKSPACE_PACKAGE_NODE_ID_PREFIX } from '../../../../src/shared/graphControls/packages/workspace';
import { projectWorkspacePackages } from '../../../../src/shared/visibleGraph/structuralProjection/packages';

function node(id: string, nodeType = 'file'): IGraphNode {
  return {
    id,
    label: id.split('/').pop() ?? id,
    color: '#111111',
    nodeType,
  };
}

describe('shared/visibleGraph/structuralProjection/packages', () => {
  it('returns empty package projection when package projection is disabled', () => {
    const projection = projectWorkspacePackages(false, [node('package.json')]);

    expect(projection.nodes).toEqual([]);
    expect(Array.from(projection.roots)).toEqual([]);
  });

  it('projects workspace package nodes from package manifests', () => {
    const projection = projectWorkspacePackages(true, [
      node('package.json'),
      node('packages/extension/package.json'),
      node('packages/extension/src/index.ts'),
      node('packages/docs/package.json', 'folder'),
    ]);

    expect(Array.from(projection.roots)).toEqual(['.', 'packages/extension']);
    expect(projection.nodes).toEqual([
      expect.objectContaining({
        id: `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}.`,
        label: 'workspace',
        color: '',
        nodeType: 'package',
      }),
      expect.objectContaining({
        id: `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}packages/extension`,
        label: 'extension',
        color: '',
        nodeType: 'package',
      }),
    ]);
  });
});
