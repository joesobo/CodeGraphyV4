import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../../src/shared/graph/contracts';
import { WORKSPACE_PACKAGE_NODE_ID_PREFIX } from '../../../src/shared/graphControls/packages/workspace';
import { STRUCTURAL_NESTS_EDGE_KIND } from '../../../src/shared/visibleGraph';
import { applyStructuralProjection } from '../../../src/shared/visibleGraph/structure';

function node(id: string, nodeType = 'file'): IGraphNode {
  return {
    id,
    label: id.split('/').pop() ?? id,
    color: '#111111',
    nodeType,
  };
}

function edge(from: string, to: string, kind: IGraphEdge['kind'] = 'import'): IGraphEdge {
  return {
    id: `${from}->${to}#${kind}`,
    from,
    to,
    kind,
    sources: [],
  };
}

function ids(graphData: IGraphData): { nodes: string[]; edges: string[] } {
  return {
    nodes: graphData.nodes.map((item) => item.id),
    edges: graphData.edges.map((item) => item.id),
  };
}

describe('shared/visibleGraph/structure/applyStructuralProjection', () => {
  it('returns the input graph when structural node types are disabled', () => {
    const graphData: IGraphData = {
      nodes: [node('src/app.ts')],
      edges: [],
    };

    expect(applyStructuralProjection(graphData)).toBe(graphData);
  });

  it('projects folders from the source graph even when file scope hides files', () => {
    const scopedGraphData: IGraphData = {
      nodes: [],
      edges: [],
    };
    const sourceGraphData: IGraphData = {
      nodes: [node('src/features/app.ts')],
      edges: [],
    };

    const result = applyStructuralProjection(
      scopedGraphData,
      {
        nodes: [
          { type: 'file', enabled: false },
          { type: 'folder', enabled: true },
        ],
        edges: [{ type: STRUCTURAL_NESTS_EDGE_KIND, enabled: true }],
      },
      sourceGraphData,
    );

    expect(ids(result)).toEqual({
      nodes: ['src', 'src/features'],
      edges: ['src->src/features#nests'],
    });
  });

  it('projects nested create results as folder nodes and nests edges', () => {
    const result = applyStructuralProjection(
      {
        nodes: [
          node('src/core/menuCreated.ts'),
          node('src/features/generated', 'folder'),
        ],
        edges: [],
      },
      {
        nodes: [
          { type: 'file', enabled: true },
          { type: 'folder', enabled: true },
        ],
        edges: [{ type: STRUCTURAL_NESTS_EDGE_KIND, enabled: true }],
      },
    );

    expect(ids(result)).toEqual({
      nodes: [
        'src/core/menuCreated.ts',
        'src/features/generated',
        'src',
        'src/core',
        'src/features',
      ],
      edges: [
        'src->src/core#nests',
        'src->src/features#nests',
        'src/features->src/features/generated#nests',
        'src/core->src/core/menuCreated.ts#nests',
      ],
    });
  });

  it('omits generated nests edges when nests are disabled explicitly', () => {
    const result = applyStructuralProjection(
      {
        nodes: [node('src/app.ts')],
        edges: [],
      },
      {
        nodes: [
          { type: 'file', enabled: true },
          { type: 'folder', enabled: true },
        ],
        edges: [{ type: STRUCTURAL_NESTS_EDGE_KIND, enabled: false }],
      },
    );

    expect(ids(result)).toEqual({
      nodes: ['src/app.ts', 'src'],
      edges: [],
    });
  });

  it('projects workspace package nodes without package-to-file nests edges', () => {
    const result = applyStructuralProjection(
      {
        nodes: [
          node('package.json'),
          node('packages/extension/package.json'),
          node('packages/extension/src/index.ts'),
        ],
        edges: [],
      },
      {
        nodes: [
          { type: 'file', enabled: true },
          { type: 'package', enabled: true },
        ],
        edges: [{ type: STRUCTURAL_NESTS_EDGE_KIND, enabled: true }],
      },
    );

    const extensionPackageId = `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}packages/extension`;
    expect(ids(result)).toEqual({
      nodes: [
        'package.json',
        'packages/extension/package.json',
        'packages/extension/src/index.ts',
        `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}.`,
        extensionPackageId,
      ],
      edges: [],
    });
  });

  it('keeps existing edges only when both endpoints remain visible', () => {
    const result = applyStructuralProjection(
      {
        nodes: [node('src/a.ts')],
        edges: [
          edge('src/a.ts', 'src/missing.ts'),
        ],
      },
      {
        nodes: [
          { type: 'file', enabled: true },
          { type: 'folder', enabled: true },
        ],
        edges: [{ type: STRUCTURAL_NESTS_EDGE_KIND, enabled: true }],
      },
    );

    expect(result.edges.map((item) => item.id)).toEqual(['src->src/a.ts#nests']);
  });
});
