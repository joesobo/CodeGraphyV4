import { describe, expect, it } from 'vitest';
import type { IGraphNode } from '../../../../src/shared/graph/contracts';
import { WORKSPACE_PACKAGE_NODE_ID_PREFIX } from '../../../../src/shared/graphControls/packages/workspace';
import { STRUCTURAL_NESTS_EDGE_KIND } from '../../../../src/shared/visibleGraph';
import {
  buildContainmentEdges,
  buildProjectedStructuralEdges,
  buildWorkspacePackageEdges,
  createStructuralEdge,
} from '../../../../src/shared/visibleGraph/structuralProjection/edges';

function node(id: string, nodeType = 'file'): IGraphNode {
  return {
    id,
    label: id.split('/').pop() ?? id,
    color: '#111111',
    nodeType,
  };
}

describe('shared/visibleGraph/structuralProjection/edges', () => {
  it('creates core nests edges with stable ids', () => {
    expect(createStructuralEdge('src', 'src/app.ts')).toEqual({
      id: 'src->src/app.ts#nests',
      from: 'src',
      to: 'src/app.ts',
      kind: STRUCTURAL_NESTS_EDGE_KIND,
      sources: [],
    });
  });

  it('builds folder containment edges for folders and files', () => {
    const edges = buildContainmentEdges(
      new Set(['(root)', 'src', 'src/features']),
      [node('src/features/app.ts'), node('README.md')],
    );

    expect(edges.map((edge) => edge.id)).toEqual([
      '(root)->src#nests',
      'src->src/features#nests',
      'src/features->src/features/app.ts#nests',
      '(root)->README.md#nests',
    ]);
  });

  it('links files to the nearest workspace package root', () => {
    const edges = buildWorkspacePackageEdges(
      new Set(['.', 'packages/extension']),
      [
        node('package.json'),
        node('packages/extension/src/index.ts'),
        node('packages/extension/src', 'folder'),
      ],
    );

    expect(edges.map((edge) => edge.id)).toEqual([
      `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}.->package.json#nests`,
      `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}packages/extension->packages/extension/src/index.ts#nests`,
    ]);
  });

  it('returns no projected edges when nests are disabled', () => {
    const edges = buildProjectedStructuralEdges(
      { folderEnabled: true, packageEnabled: true, nestsEnabled: false },
      new Set(['src']),
      new Set(['.']),
      [node('src/app.ts')],
    );

    expect(edges).toEqual([]);
  });

  it('combines enabled folder and package edge projections', () => {
    const edges = buildProjectedStructuralEdges(
      { folderEnabled: true, packageEnabled: true, nestsEnabled: true },
      new Set(['src']),
      new Set(['.']),
      [node('src/app.ts')],
    );

    expect(edges.map((edge) => edge.id)).toEqual([
      '(root)->src#nests',
      'src->src/app.ts#nests',
      `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}.->src/app.ts#nests`,
    ]);
  });
});
