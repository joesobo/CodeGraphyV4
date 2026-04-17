import { describe, expect, it } from 'vitest';
import type { IViewContext } from '../../../../src/core/views/contracts';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import {
  filterDepthGraph,
  getDepthGraphEffectiveDepthLimit,
  getDepthGraphMaxDepthLimit,
} from '../../../../src/core/views/depth/transform';

const sampleData: IGraphData = {
  nodes: [
    { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' },
    { id: 'src/lib.ts', label: 'lib.ts', color: '#93C5FD' },
    { id: 'src/deep.ts', label: 'deep.ts', color: '#93C5FD' },
    { id: 'src/leaf.ts', label: 'leaf.ts', color: '#93C5FD' },
    { id: 'src/orphan.ts', label: 'orphan.ts', color: '#93C5FD' },
  ],
  edges: [
    { id: 'app->lib', from: 'src/app.ts', to: 'src/lib.ts', kind: 'import', sources: [] },
    { id: 'lib->deep', from: 'src/lib.ts', to: 'src/deep.ts', kind: 'import', sources: [] },
    { id: 'deep->leaf', from: 'src/deep.ts', to: 'src/leaf.ts', kind: 'import', sources: [] },
  ],
};

function context(overrides: Partial<IViewContext> = {}): IViewContext {
  return {
    activePlugins: new Set(),
    ...overrides,
  };
}

describe('core/views/depth/transform', () => {
  it('falls back to the configured max depth when there is no focused file', () => {
    expect(getDepthGraphMaxDepthLimit(sampleData, undefined, 7)).toBe(7);
  });

  it('caps the effective depth limit to the reachable max depth', () => {
    expect(
      getDepthGraphEffectiveDepthLimit(
        sampleData,
        context({ focusedFile: 'src/lib.ts', depthLimit: 9 }),
      ),
    ).toBe(2);
  });

  it('returns the full graph when the focused file is missing from the graph', () => {
    expect(
      filterDepthGraph(sampleData, context({ focusedFile: 'src/missing.ts', depthLimit: 3 })),
    ).toEqual(sampleData);
  });

  it('adds depth levels to the filtered nodes for reachable neighbors', () => {
    const result = filterDepthGraph(
      sampleData,
      context({ focusedFile: 'src/lib.ts', depthLimit: 2 }),
    );

    expect(result.nodes.map((node) => [node.id, node.depthLevel])).toEqual([
      ['src/app.ts', 1],
      ['src/lib.ts', 0],
      ['src/deep.ts', 1],
      ['src/leaf.ts', 2],
    ]);
  });

  it('drops edges that leave the induced depth-limited subgraph', () => {
    const result = filterDepthGraph(
      sampleData,
      context({ focusedFile: 'src/lib.ts', depthLimit: 1 }),
    );

    expect(result.nodes.map((node) => node.id)).toEqual([
      'src/app.ts',
      'src/lib.ts',
      'src/deep.ts',
    ]);
    expect(result.edges.map((edge) => edge.id)).toEqual([
      'app->lib',
      'lib->deep',
    ]);
  });
});
