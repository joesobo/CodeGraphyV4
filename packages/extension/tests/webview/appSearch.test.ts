import { describe, expect, it } from 'vitest';
import { DEFAULT_NODE_COLOR } from '../../src/shared/types';
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
});
