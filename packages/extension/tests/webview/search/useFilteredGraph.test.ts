import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { IGraphData } from '../../../src/shared/graph/contracts';
import type { IGroup } from '../../../src/shared/settings/groups';

const deriveVisibleGraphMock = vi.hoisted(() => vi.fn());

vi.mock('../../../src/shared/visibleGraph', () => ({
  deriveVisibleGraph: deriveVisibleGraphMock,
}));

import { useFilteredGraph } from '../../../src/webview/search/useFilteredGraph';

const sampleGraph: IGraphData = {
  nodes: [
    { id: 'src/App.ts', label: 'App', color: '#aaa' },
    { id: 'src/util.ts', label: 'util', color: '#bbb' },
  ],
  edges: [{ id: 'e1', from: 'src/App.ts', to: 'src/util.ts', kind: 'import', sources: [] }],
};

const defaultOptions = { matchCase: false, wholeWord: false, regex: false };

describe('useFilteredGraph', () => {
  beforeEach(() => {
    deriveVisibleGraphMock.mockReset();
    deriveVisibleGraphMock.mockReturnValue({ graphData: sampleGraph, regexError: null });
  });

  it('delegates visible graph derivation with scope, filter, search, and show-orphans config', () => {
    renderHook(() =>
      useFilteredGraph(
        sampleGraph,
        'App',
        { ...defaultOptions, wholeWord: true },
        [],
        {},
        { file: true, folder: false },
        { import: false, custom: true, 'codegraphy:nests': false },
        [
          { id: 'import', label: 'Imports', defaultColor: '#60a5fa', defaultVisible: true },
          {
            id: 'codegraphy:nests',
            label: 'Nests',
            defaultColor: '#64748b',
            defaultVisible: true,
          },
        ],
        {},
        ['README.md'],
        false,
      ),
    );

    expect(deriveVisibleGraphMock).toHaveBeenCalledWith(sampleGraph, {
      scope: {
        nodes: [
          { type: 'file', enabled: true },
          { type: 'folder', enabled: false },
        ],
        edges: [
          { type: 'import', enabled: false },
          { type: 'nests', enabled: false },
          { type: 'custom', enabled: true },
        ],
      },
      filter: { patterns: ['README.md'] },
      search: {
        query: 'App',
        options: { matchCase: false, wholeWord: true, regex: false },
      },
      showOrphans: false,
    });
  });

  it('omits empty filter and blank search stages', () => {
    renderHook(() =>
      useFilteredGraph(sampleGraph, '   ', defaultOptions, [], {}, {}, {}, []),
    );

    expect(deriveVisibleGraphMock).toHaveBeenCalledWith(sampleGraph, {
      scope: { nodes: [], edges: [] },
      filter: undefined,
      search: undefined,
      showOrphans: true,
    });
  });

  it('returns null graph fields when shared derivation returns null graphData', () => {
    deriveVisibleGraphMock.mockReturnValue({ graphData: null, regexError: null });

    const { result } = renderHook(() =>
      useFilteredGraph(null, '', defaultOptions, [], {}, {}, {}, []),
    );

    expect(result.current.filteredData).toBeNull();
    expect(result.current.coloredData).toBeNull();
    expect(result.current.edgeDecorations).toEqual({});
  });

  it('passes through regex errors from shared derivation', () => {
    deriveVisibleGraphMock.mockReturnValue({ graphData: sampleGraph, regexError: 'Invalid regex' });

    const { result } = renderHook(() =>
      useFilteredGraph(sampleGraph, '[invalid', { ...defaultOptions, regex: true }, [], {}, {}, {}, []),
    );

    expect(result.current.regexError).toBe('Invalid regex');
  });

  it('applies node colors, edge default colors, legends, and decoration filtering after derivation', () => {
    const groups: IGroup[] = [
      { id: 'node-rule', pattern: 'src/**', color: '#ff0000' },
      { id: 'edge-rule', pattern: 'import', color: '#123456', target: 'edge' },
    ];

    const { result } = renderHook(() =>
      useFilteredGraph(
        sampleGraph,
        '',
        defaultOptions,
        groups,
        { file: '#224466' },
        {},
        {},
        [{ id: 'import', label: 'Imports', defaultColor: '#60a5fa', defaultVisible: true }],
        {
          e1: { label: { text: 'kept' } },
          hidden: { label: { text: 'dropped' } },
        },
      ),
    );

    expect(result.current.filteredData?.nodes.every((node) => node.color === '#224466')).toBe(true);
    expect(result.current.filteredData?.edges[0]?.color).toBe('#60a5fa');
    expect(result.current.coloredData?.nodes.every((node) => node.color === '#ff0000')).toBe(true);
    expect(result.current.coloredData?.edges[0]?.color).toBe('#123456');
    expect(result.current.edgeDecorations).toEqual({ e1: { label: { text: 'kept' } } });
  });

  it('applies legacy nests edge defaults to shared nests edges after derivation', () => {
    deriveVisibleGraphMock.mockReturnValue({
      graphData: {
        nodes: sampleGraph.nodes,
        edges: [
          {
            id: 'nest',
            from: 'src/App.ts',
            to: 'src/util.ts',
            kind: 'nests',
            sources: [],
          },
        ],
      },
      regexError: null,
    });

    const { result } = renderHook(() =>
      useFilteredGraph(
        sampleGraph,
        '',
        defaultOptions,
        [],
        {},
        {},
        {},
        [
          {
            id: 'codegraphy:nests',
            label: 'Nests',
            defaultColor: '#64748b',
            defaultVisible: true,
          },
        ],
      ),
    );

    expect(result.current.filteredData?.edges[0]?.color).toBe('#64748b');
  });

  it('returns all hook fields', () => {
    const { result } = renderHook(() =>
      useFilteredGraph(sampleGraph, '', defaultOptions, [], {}, {}, {}, []),
    );

    expect(result.current).toHaveProperty('filteredData');
    expect(result.current).toHaveProperty('coloredData');
    expect(result.current).toHaveProperty('edgeDecorations');
    expect(result.current).toHaveProperty('regexError');
  });
});
