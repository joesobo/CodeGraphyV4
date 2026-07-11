import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import { getShellGraphCountState } from '../../../../src/webview/app/shell/counts';

function graphWithNodes(count: number): IGraphData {
  return {
    nodes: Array.from({ length: count }, (_, index) => ({
      id: `node-${index}`,
      label: `Node ${index}`,
      color: '#3B82F6',
    })),
    edges: [],
  };
}

describe('webview/app/shell/counts', () => {
  it('uses visible baseline data when deriving filter counts', () => {
    expect(getShellGraphCountState({
      countBaseData: graphWithNodes(5),
      filterVisibleData: graphWithNodes(3),
      filteredData: graphWithNodes(2),
      graphData: graphWithNodes(10),
      regexError: null,
      searchQuery: 'node',
    })).toEqual({
      countState: { kind: 'search-and-filters', label: '2 of 3' },
      countTotal: 5,
      excludedCount: 2,
      filterVisibleCount: 3,
    });
  });

  it('falls back to graph data when visible derivations are unavailable', () => {
    expect(getShellGraphCountState({
      countBaseData: null,
      filterVisibleData: null,
      filteredData: null,
      graphData: graphWithNodes(4),
      regexError: null,
      searchQuery: '',
    })).toEqual({
      countState: { kind: 'idle', label: null },
      countTotal: 4,
      excludedCount: 0,
      filterVisibleCount: 4,
    });
  });

  it('includes files excluded before graph construction in totals', () => {
    expect(getShellGraphCountState({
      countBaseData: graphWithNodes(5),
      filesExcludedCount: 2,
      filterVisibleData: graphWithNodes(3),
      filteredData: null,
      graphData: graphWithNodes(5),
      regexError: null,
      searchQuery: '',
    })).toEqual({
      countState: { kind: 'filters-only', label: '3 of 7' },
      countTotal: 7,
      excludedCount: 4,
      filterVisibleCount: 3,
    });
  });

  it('does not show a search count when the search query is blank', () => {
    expect(getShellGraphCountState({
      countBaseData: graphWithNodes(4),
      filterVisibleData: graphWithNodes(4),
      filteredData: graphWithNodes(2),
      graphData: graphWithNodes(4),
      regexError: null,
      searchQuery: '',
    }).countState).toEqual({ kind: 'idle', label: null });
  });

  it('surfaces regex errors ahead of count labels', () => {
    expect(getShellGraphCountState({
      countBaseData: graphWithNodes(4),
      filterVisibleData: graphWithNodes(2),
      filteredData: null,
      graphData: graphWithNodes(4),
      regexError: 'unterminated group',
      searchQuery: '(',
    }).countState).toEqual({ kind: 'invalid-regex', label: 'Invalid regex' });
  });
});
