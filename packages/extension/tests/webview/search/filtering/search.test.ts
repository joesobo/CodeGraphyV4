import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import { filterGraphData } from '../../../../src/webview/search/filtering/search';

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

const defaultOptions = { matchCase: false, wholeWord: false, regex: false };

describe('search/filtering/search', () => {
  it('returns null when no graph data is available', () => {
    expect(filterGraphData(null, 'App', defaultOptions)).toEqual({
      filteredData: null,
      regexError: null,
    });
  });

  it('returns the original graph for an empty query', () => {
    const result = filterGraphData(graphData, '   ', defaultOptions);

    expect(result.filteredData).toBe(graphData);
    expect(result.regexError).toBeNull();
  });

  it('filters nodes and only keeps edges whose endpoints still match', () => {
    const result = filterGraphData(graphData, 'src', defaultOptions);

    expect(result.filteredData?.nodes.map((node) => node.id)).toEqual(['src/App.ts', 'src/util.ts']);
    expect(result.filteredData?.edges).toEqual([
      { id: 'edge-1', from: 'src/App.ts', to: 'src/util.ts', kind: 'import', sources: [] },
    ]);
  });

  it('surfaces regex errors from the underlying matcher', () => {
    const result = filterGraphData(graphData, '[invalid', { ...defaultOptions, regex: true });

    expect(result.regexError).toBeTruthy();
    expect(result.filteredData?.nodes).toEqual([]);
    expect(result.filteredData?.edges).toEqual([]);
  });
});
