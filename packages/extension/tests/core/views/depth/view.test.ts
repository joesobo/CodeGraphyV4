import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IViewContext } from '../../../../src/core/views/contracts';
import type { IGraphData } from '../../../../src/shared/graph/types';

const sampleData: IGraphData = {
  nodes: [
    { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' },
    { id: 'src/lib.ts', label: 'lib.ts', color: '#93C5FD' },
    { id: 'src/deep.ts', label: 'deep.ts', color: '#93C5FD' },
    { id: 'src/leaf.ts', label: 'leaf.ts', color: '#93C5FD' },
    { id: 'src/orphan.ts', label: 'orphan.ts', color: '#93C5FD' },
  ],
  edges: [
    { id: 'app->lib', from: 'src/app.ts', to: 'src/lib.ts' , kind: 'import', sources: [] },
    { id: 'lib->deep', from: 'src/lib.ts', to: 'src/deep.ts' , kind: 'import', sources: [] },
    { id: 'deep->leaf', from: 'src/deep.ts', to: 'src/leaf.ts' , kind: 'import', sources: [] },
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

  it('exposes the expected depth view metadata', async () => {
    const { depthGraphView } = await import('../../../../src/core/views/depth/view');

    expect(depthGraphView.id).toBe('codegraphy.depth-graph');
    expect(depthGraphView.name).toBe('Depth Graph');
    expect(depthGraphView.icon).toBe('target');
    expect(depthGraphView.description).toBe('Shows a local graph around the focused file');
    expect(depthGraphView.recomputeOn).toEqual(['focusedFile', 'depthLimit']);
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

  it('keeps induced edges between visible neighbors when re-rooting a depth-1 graph', async () => {
    const { depthGraphView } = await import('../../../../src/core/views/depth/view');

    const result = depthGraphView.transform(
      {
        nodes: [
          { id: 'enemy.gd', label: 'enemy.gd', color: '#93C5FD' },
          { id: 'player.gd', label: 'player.gd', color: '#93C5FD' },
          { id: 'game_manager.gd', label: 'game_manager.gd', color: '#93C5FD' },
          { id: 'math_helpers.gd', label: 'math_helpers.gd', color: '#93C5FD' },
          { id: 'entity.gd', label: 'entity.gd', color: '#93C5FD' },
        ],
        edges: [
          { id: 'enemy->entity', from: 'enemy.gd', to: 'entity.gd', kind: 'inherit', sources: [] },
          { id: 'enemy->player', from: 'enemy.gd', to: 'player.gd', kind: 'reference', sources: [] },
          { id: 'enemy->math', from: 'enemy.gd', to: 'math_helpers.gd', kind: 'load', sources: [] },
          { id: 'manager->enemy', from: 'game_manager.gd', to: 'enemy.gd', kind: 'reference', sources: [] },
          { id: 'manager->player', from: 'game_manager.gd', to: 'player.gd', kind: 'reference', sources: [] },
          { id: 'player->math', from: 'player.gd', to: 'math_helpers.gd', kind: 'load', sources: [] },
        ],
      },
      context({ focusedFile: 'enemy.gd', depthLimit: 1 }),
    );

    expect(result.nodes.map(node => node.id)).toEqual([
      'enemy.gd',
      'player.gd',
      'game_manager.gd',
      'math_helpers.gd',
      'entity.gd',
    ]);
    expect(result.edges.map(edge => edge.id)).toEqual([
      'enemy->entity',
      'enemy->player',
      'enemy->math',
      'manager->enemy',
      'manager->player',
      'player->math',
    ]);
  });

  it('falls back to the full graph when the focused file is not in the graph', async () => {
    const { depthGraphView } = await import('../../../../src/core/views/depth/view');

    const result = depthGraphView.transform(
      sampleData,
      context({ focusedFile: 'src/missing.ts', depthLimit: 3 }),
    );

    expect(result).toEqual(sampleData);
  });

  it('computes the max depth range from the focused node and clamps orphan roots to 1', async () => {
    const { getDepthGraphMaxDepthLimit } = await import('../../../../src/core/views/depth/view');

    expect(getDepthGraphMaxDepthLimit(sampleData, 'src/lib.ts')).toBe(2);
    expect(getDepthGraphMaxDepthLimit(sampleData, 'src/app.ts')).toBe(3);
    expect(getDepthGraphMaxDepthLimit(sampleData, 'src/orphan.ts')).toBe(1);
    expect(getDepthGraphMaxDepthLimit(sampleData, 'src/missing.ts')).toBe(10);
  });

  it('caps the effective depth limit to the reachable max depth', async () => {
    const { depthGraphView, getDepthGraphEffectiveDepthLimit } = await import(
      '../../../../src/core/views/depth/view'
    );

    expect(
      getDepthGraphEffectiveDepthLimit(
        sampleData,
        context({ focusedFile: 'src/lib.ts', depthLimit: 9 }),
      ),
    ).toBe(2);

    const result = depthGraphView.transform(
      sampleData,
      context({ focusedFile: 'src/lib.ts', depthLimit: 9 }),
    );

    expect(result.nodes.map(node => node.id)).toEqual([
      'src/app.ts',
      'src/lib.ts',
      'src/deep.ts',
      'src/leaf.ts',
    ]);
  });
});
