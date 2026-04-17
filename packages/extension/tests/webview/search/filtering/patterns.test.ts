import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import { applyFilterPatterns } from '../../../../src/webview/search/filtering/patterns';

const graphData: IGraphData = {
  nodes: [
    { id: 'src/App.ts', label: 'App', color: '#111111' },
    { id: 'src/util.ts', label: 'utility', color: '' },
    { id: 'README.md', label: 'README', color: '#333333' },
  ],
  edges: [
    { id: 'edge-1', from: 'src/App.ts', to: 'src/util.ts', kind: 'import', sources: [] },
    { id: 'edge-2', from: 'src/util.ts', to: 'README.md', kind: 'import', sources: [] },
  ],
};

describe('search/filtering/patterns', () => {
  it('returns the original graph when data is null or there are no patterns', () => {
    expect(applyFilterPatterns(null, ['README.md'])).toBeNull();
    expect(applyFilterPatterns(graphData, [])).toBe(graphData);
  });

  it('removes matched nodes and drops edges whose endpoints disappear', () => {
    const result = applyFilterPatterns(graphData, ['README.md']);

    expect(result?.nodes.map((node) => node.id)).toEqual(['src/App.ts', 'src/util.ts']);
    expect(result?.edges).toEqual([
      { id: 'edge-1', from: 'src/App.ts', to: 'src/util.ts', kind: 'import', sources: [] },
    ]);
  });
});
