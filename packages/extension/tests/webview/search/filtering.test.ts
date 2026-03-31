import { describe, expect, it } from 'vitest';
import { DEFAULT_NODE_COLOR } from '../../../src/shared/fileColors';
import type { IGraphData } from '../../../src/shared/graph/types';
import type { IGroup } from '../../../src/shared/settings/groups';
import { applyGroupColors, filterGraphData } from '../../../src/webview/search/filtering';

const graphData: IGraphData = {
  nodes: [
    { id: 'src/App.ts', label: 'App', color: '#111111' },
    { id: 'src/util.ts', label: 'utility', color: '' },
    { id: 'README.md', label: 'README', color: '#333333' },
  ],
  edges: [
    { id: 'edge-1', from: 'src/App.ts', to: 'src/util.ts' },
    { id: 'edge-2', from: 'src/util.ts', to: 'README.md' },
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
      { id: 'edge-1', from: 'src/App.ts', to: 'src/util.ts' },
    ]);
  });

  it('surfaces regex errors from the underlying matcher', () => {
    const result = filterGraphData(graphData, '[invalid', { ...defaultOptions, regex: true });

    expect(result.regexError).toBeTruthy();
    expect(result.filteredData?.nodes).toEqual([]);
    expect(result.filteredData?.edges).toEqual([]);
  });

  it('returns null when applying group colors to null data', () => {
    expect(applyGroupColors(null, [])).toBeNull();
  });

  it('returns null for null data even when groups are provided', () => {
    const groups: IGroup[] = [{ id: 'typescript', pattern: '*.ts', color: '#ff0000' }];

    expect(() => applyGroupColors(null, groups)).not.toThrow();
    expect(applyGroupColors(null, groups)).toBeNull();
  });

  it('returns the original data when no groups are provided', () => {
    expect(applyGroupColors(graphData, [])).toBe(graphData);
  });

  it('applies the first matching non-disabled group attributes', () => {
    const groups: IGroup[] = [
      { id: 'disabled', pattern: 'src/**', color: '#999999', disabled: true },
      {
        id: 'typescript',
        pattern: 'src/**',
        color: '#ff0000',
        shape2D: 'diamond',
        shape3D: 'cube',
        imageUrl: 'icon.png',
      },
      { id: 'fallback', pattern: '**/*.ts', color: '#00ff00' },
    ];

    const result = applyGroupColors(graphData, groups);

    expect(result?.nodes[0]).toMatchObject({
      color: '#ff0000',
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

    const result = applyGroupColors(nestedGraphData, groups);

    expect(result?.nodes[0]).toMatchObject({ color: '#ff0000' });
    expect(result?.nodes[1]).toMatchObject({ color: '#333333' });
  });

  it('falls back to the existing node color or the default color when no group matches', () => {
    const groups: IGroup[] = [{ id: 'markdown', pattern: '*.md', color: '#00ff00' }];

    const result = applyGroupColors(graphData, groups);

    expect(result?.nodes[0]?.color).toBe('#111111');
    expect(result?.nodes[1]?.color).toBe(DEFAULT_NODE_COLOR);
    expect(result?.nodes[2]?.color).toBe('#00ff00');
  });
});
