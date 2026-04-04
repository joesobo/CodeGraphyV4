import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IViewContext } from '../../../../src/core/views/contracts';
import type { IGraphData } from '../../../../src/shared/graph/types';

const sampleData: IGraphData = {
  nodes: [
    { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' },
    { id: 'src/lib.ts', label: 'lib.ts', color: '#93C5FD' },
    { id: 'src/deep.ts', label: 'deep.ts', color: '#93C5FD' },
    { id: 'src/leaf.ts', label: 'leaf.ts', color: '#93C5FD' },
  ],
  edges: [
    { id: 'app->lib', from: 'src/app.ts', to: 'src/lib.ts' },
    { id: 'lib->deep', from: 'src/lib.ts', to: 'src/deep.ts' },
    { id: 'deep->leaf', from: 'src/deep.ts', to: 'src/leaf.ts' },
  ],
};

function context(overrides: Partial<IViewContext> = {}): IViewContext {
  return {
    activePlugins: new Set(),
    ...overrides,
  };
}

describe('core/views/depth/view', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns the full graph when there is no focused file', async () => {
    const { depthGraphView } = await import('../../../../src/core/views/depth/view');

    const result = depthGraphView.transform(sampleData, context());

    expect(result).toEqual(sampleData);
  });

  it('returns the focused node and its immediate neighbors at depth 1', async () => {
    const { depthGraphView } = await import('../../../../src/core/views/depth/view');

    const result = depthGraphView.transform(
      sampleData,
      context({ focusedFile: 'src/lib.ts', depthLimit: 1 }),
    );

    expect(result.nodes.map(node => node.id)).toEqual([
      'src/app.ts',
      'src/lib.ts',
      'src/deep.ts',
    ]);
    expect(result.edges.map(edge => edge.id)).toEqual(['app->lib', 'lib->deep']);
  });

  it('includes two-hop neighbors when depth limit is 2', async () => {
    const { depthGraphView } = await import('../../../../src/core/views/depth/view');

    const result = depthGraphView.transform(
      sampleData,
      context({ focusedFile: 'src/lib.ts', depthLimit: 2 }),
    );

    expect(result.nodes.map(node => node.id)).toEqual([
      'src/app.ts',
      'src/lib.ts',
      'src/deep.ts',
      'src/leaf.ts',
    ]);
    expect(result.nodes.find(node => node.id === 'src/lib.ts')?.depthLevel).toBe(0);
    expect(result.nodes.find(node => node.id === 'src/app.ts')?.depthLevel).toBe(1);
    expect(result.nodes.find(node => node.id === 'src/leaf.ts')?.depthLevel).toBe(2);
  });

  it('falls back to the full graph when the focused file is not in the graph', async () => {
    const { depthGraphView } = await import('../../../../src/core/views/depth/view');

    const result = depthGraphView.transform(
      sampleData,
      context({ focusedFile: 'src/missing.ts', depthLimit: 3 }),
    );

    expect(result).toEqual(sampleData);
  });
});
