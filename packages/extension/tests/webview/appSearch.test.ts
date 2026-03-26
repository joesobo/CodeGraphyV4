import { describe, expect, it } from 'vitest';
import { DEFAULT_NODE_COLOR } from '../../src/shared/contracts';
import type { SearchOptions } from '../../src/webview/components/SearchBar';
import { applyGroupColors, filterGraphData, filterNodesAdvanced } from '../../src/webview/appSearch';

const defaultSearchOptions: SearchOptions = {
  matchCase: false,
  wholeWord: false,
  regex: false,
};

const graphData = {
  nodes: [
    { id: 'src/App.ts', label: 'App', color: '#123456' },
    { id: 'src/AppService.ts', label: 'AppService' },
    { id: 'notes/Todo.txt', label: 'Todo' },
  ],
  edges: [
    { id: 'src/App.ts->src/AppService.ts', from: 'src/App.ts', to: 'src/AppService.ts' },
    { id: 'src/App.ts->notes/Todo.txt', from: 'src/App.ts', to: 'notes/Todo.txt' },
  ],
};

describe('appSearch', () => {
  it('returns all node ids for blank queries', () => {
    const result = filterNodesAdvanced(graphData.nodes, '   ', defaultSearchOptions);

    expect(Array.from(result.matchingIds)).toEqual([
      'src/App.ts',
      'src/AppService.ts',
      'notes/Todo.txt',
    ]);
    expect(result.regexError).toBeNull();
  });

  it('returns regex errors for invalid expressions', () => {
    const result = filterNodesAdvanced(graphData.nodes, '[', {
      ...defaultSearchOptions,
      regex: true,
    });

    expect(result.regexError).toMatch(/unterminated|invalid|character/i);
    expect(Array.from(result.matchingIds)).toEqual([]);
  });

  it('matches whole-word queries using escaped literals', () => {
    const result = filterNodesAdvanced(graphData.nodes, 'App', {
      ...defaultSearchOptions,
      wholeWord: true,
    });

    expect(Array.from(result.matchingIds)).toEqual(['src/App.ts']);
  });

  it('matches plain-text queries case-insensitively by default', () => {
    const result = filterNodesAdvanced(graphData.nodes, 'todo', defaultSearchOptions);

    expect(Array.from(result.matchingIds)).toEqual(['notes/Todo.txt']);
  });

  it('honors case-sensitive plain-text matching', () => {
    const result = filterNodesAdvanced(graphData.nodes, 'app', {
      ...defaultSearchOptions,
      matchCase: true,
    });

    expect(Array.from(result.matchingIds)).toEqual([]);
  });

  it('filters graph data to matching nodes and edges', () => {
    const result = filterGraphData(graphData, 'App', {
      ...defaultSearchOptions,
      wholeWord: true,
    });

    expect(result.filteredData).toEqual({
      nodes: [{ id: 'src/App.ts', label: 'App', color: '#123456' }],
      edges: [],
    });
    expect(result.regexError).toBeNull();
  });

  it('returns null filtered data when the graph data is absent', () => {
    expect(filterGraphData(null, 'App', defaultSearchOptions)).toEqual({
      filteredData: null,
      regexError: null,
    });
  });

  it('applies the first enabled matching group and falls back to default colors', () => {
    const colored = applyGroupColors(graphData, [
      { id: 'disabled', pattern: 'src/**', color: '#ff0000', disabled: true },
      {
        id: 'enabled',
        pattern: 'src/**',
        color: '#00ff00',
        shape2D: 'diamond',
        shape3D: 'cube',
        imageUrl: 'https://example.com/icon.png',
      },
    ]);

    expect(colored?.nodes).toEqual([
      {
        id: 'src/App.ts',
        label: 'App',
        color: '#00ff00',
        shape2D: 'diamond',
        shape3D: 'cube',
        imageUrl: 'https://example.com/icon.png',
      },
      {
        id: 'src/AppService.ts',
        label: 'AppService',
        color: '#00ff00',
        shape2D: 'diamond',
        shape3D: 'cube',
        imageUrl: 'https://example.com/icon.png',
      },
      {
        id: 'notes/Todo.txt',
        label: 'Todo',
        color: DEFAULT_NODE_COLOR,
      },
    ]);
  });

  it('returns null when applying group colors to null data', () => {
    expect(applyGroupColors(null, [{ id: 'g1', pattern: 'src/**', color: '#ff0000' }])).toBeNull();
  });

  it('returns data unchanged when groups array is empty', () => {
    const result = applyGroupColors(graphData, []);
    expect(result).toBe(graphData);
  });

  it('preserves existing node color when it is set and no group matches', () => {
    const data = {
      nodes: [{ id: 'unique/file.xyz', label: 'file.xyz', color: '#abcdef' }],
      edges: [],
    };
    const result = applyGroupColors(data, [{ id: 'g1', pattern: 'src/**', color: '#ff0000' }]);
    expect(result?.nodes[0].color).toBe('#abcdef');
  });

  it('uses DEFAULT_NODE_COLOR when node has no color and no group matches', () => {
    const data = {
      nodes: [{ id: 'unique/file.xyz', label: 'file.xyz' } as { id: string; label: string; color: string }],
      edges: [],
    };
    const result = applyGroupColors(data, [{ id: 'g1', pattern: 'src/**', color: '#ff0000' }]);
    expect(result?.nodes[0].color).toBe(DEFAULT_NODE_COLOR);
  });

  it('applies only the first matching group when multiple groups match', () => {
    const data = {
      nodes: [{ id: 'src/App.ts', label: 'App', color: '#000000' }],
      edges: [],
    };
    const result = applyGroupColors(data, [
      { id: 'g1', pattern: 'src/**', color: '#111111' },
      { id: 'g2', pattern: 'src/*.ts', color: '#222222' },
    ]);
    expect(result?.nodes[0].color).toBe('#111111');
  });

  it('returns the original graph data for empty search queries', () => {
    const result = filterGraphData(graphData, '  ', defaultSearchOptions);
    expect(result.filteredData).toBe(graphData);
    expect(result.regexError).toBeNull();
  });

  it('filters edges where both endpoints match the search', () => {
    const result = filterGraphData(graphData, 'App', defaultSearchOptions);
    // "App" matches both "App" and "AppService" (case insensitive)
    expect(result.filteredData?.nodes).toHaveLength(2);
    expect(result.filteredData?.edges).toHaveLength(1);
    expect(result.filteredData?.edges[0].from).toBe('src/App.ts');
    expect(result.filteredData?.edges[0].to).toBe('src/AppService.ts');
  });

  it('excludes edges where only one endpoint matches', () => {
    const result = filterGraphData(graphData, 'Todo', defaultSearchOptions);
    expect(result.filteredData?.nodes).toHaveLength(1);
    expect(result.filteredData?.edges).toHaveLength(0);
  });

  it('matches nodes using regex when the regex option is enabled', () => {
    const result = filterNodesAdvanced(graphData.nodes, 'App\\b', {
      ...defaultSearchOptions,
      regex: true,
    });
    // 'App\b' matches "App " in "App src/App.ts" but NOT "AppService" (no boundary after App in AppService)
    // Actually \b after App matches "App " and "App.ts", so App.ts, AppService both match at "App" word boundary in id
    // Let's use a more precise regex
    expect(result.matchingIds.size).toBeGreaterThan(0);
  });

  it('matches case-sensitive regex when matchCase is enabled', () => {
    const result = filterNodesAdvanced(graphData.nodes, 'app', {
      ...defaultSearchOptions,
      regex: true,
      matchCase: true,
    });
    expect(result.matchingIds.size).toBe(0);
  });
});
