import { describe, expect, it } from 'vitest';
import { DEFAULT_NODE_COLOR } from '../../../src/shared/fileColors';
import type { IGraphData } from '../../../src/shared/graph/contracts';
import type { IGroup } from '../../../src/shared/settings/groups';
import {
  applyLegendRules,
} from '../../../src/webview/search/filtering/rules';
import { applyFilterPatterns } from '../../../src/webview/search/filtering/patterns';
import { filterGraphData } from '../../../src/webview/search/filtering/search';

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

describe('search filtering', () => {
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
    const result = filterGraphData(graphData, 'App', defaultOptions);

    expect(result.regexError).toBeNull();
    expect(result.filteredData?.nodes.map((node) => node.id)).toEqual(['src/App.ts']);
    expect(result.filteredData?.edges).toEqual([]);
  });

  it('keeps edges whose endpoints both remain after filtering', () => {
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

  it('filters graph nodes and edges by custom filter patterns', () => {
    const result = applyFilterPatterns(graphData, ['README.md']);

    expect(result?.nodes.map((node) => node.id)).toEqual(['src/App.ts', 'src/util.ts']);
    expect(result?.edges).toEqual([
      { id: 'edge-1', from: 'src/App.ts', to: 'src/util.ts', kind: 'import', sources: [] },
    ]);
  });

  it('returns null when applying group colors to null data', () => {
    expect(applyLegendRules(null, [])).toBeNull();
  });

  it('returns null for null data even when groups are provided', () => {
    const groups: IGroup[] = [{ id: 'typescript', pattern: '*.ts', color: '#ff0000' }];

    expect(() => applyLegendRules(null, groups)).not.toThrow();
    expect(applyLegendRules(null, groups)).toBeNull();
  });

  it('returns the original data when no groups are provided', () => {
    expect(applyLegendRules(graphData, [])).toBe(graphData);
  });

  it('applies legend rules from bottom to top so later matches override earlier ones', () => {
    const groups: IGroup[] = [
      {
        id: 'specific',
        pattern: 'src/App.ts',
        color: '#00ff00',
        imageUrl: 'icon.png',
      },
      { id: 'disabled', pattern: 'src/**', color: '#999999', disabled: true },
      {
        id: 'typescript',
        pattern: 'src/**',
        color: '#ff0000',
        shape2D: 'diamond',
        shape3D: 'cube',
      },
    ];

    const result = applyLegendRules(graphData, groups);

    expect(result?.nodes[0]).toMatchObject({
      color: '#00ff00',
      shape2D: 'diamond',
      shape3D: 'cube',
      imageUrl: 'icon.png',
    });
  });

  it('applies folder-based group patterns by folder basename at any depth', () => {
    const nestedGraphData: IGraphData = {
      nodes: [
        { id: 'packages/extension/src/App.ts', label: 'App', color: '#111111' },
        { id: 'packages/extension/docs/README.md', label: 'README', color: '#333333' },
      ],
      edges: [],
    };
    const groups: IGroup[] = [{ id: 'source', pattern: 'src/*', color: '#ff0000' }];

    const result = applyLegendRules(nestedGraphData, groups);

    expect(result?.nodes[0]).toMatchObject({ color: '#ff0000' });
    expect(result?.nodes[1]).toMatchObject({ color: '#333333' });
  });

  it('falls back to the existing node color or the default color when no group matches', () => {
    const groups: IGroup[] = [{ id: 'markdown', pattern: '*.md', color: '#00ff00' }];

    const result = applyLegendRules(graphData, groups);

    expect(result?.nodes[0]?.color).toBe('#111111');
    expect(result?.nodes[1]?.color).toBe(DEFAULT_NODE_COLOR);
    expect(result?.nodes[2]?.color).toBe('#00ff00');
  });

  it('applies edge-targeted legend rules without changing matching nodes', () => {
    const groups: IGroup[] = [
      { id: 'import-edges', pattern: 'import', color: '#ff8800', target: 'edge' },
    ];

    const result = applyLegendRules(graphData, groups);

    expect(result?.edges[0]?.color).toBe('#ff8800');
    expect(result?.edges[1]?.color).toBe('#ff8800');
    expect(result?.nodes[0]?.color).toBe('#111111');
  });
});
