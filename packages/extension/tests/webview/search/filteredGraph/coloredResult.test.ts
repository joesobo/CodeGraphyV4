import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import type { IGroup } from '../../../../src/shared/settings/groups';
import { getColoredGraphResult } from '../../../../src/webview/search/filteredGraph/coloredResult';
import { createReferenceResultCache } from '../../../../src/webview/search/filteredGraph/referenceCache';

describe('webview/search/filteredGraph/coloredResult', () => {
  it('returns null when there is no filtered graph data', () => {
    const result = getColoredGraphResult({
      cache: createReferenceResultCache(),
      filteredData: null,
      key: 'legends',
      legends: [],
    });

    expect(result).toBeNull();
  });

  it('applies legend rules and caches the colored result by graph reference and key', () => {
    const cache = createReferenceResultCache<IGraphData>();
    const filteredData = createGraphData();
    const legends: IGroup[] = [
      {
        id: 'source-files',
        pattern: 'src/**',
        color: '#f9a8d4',
      },
    ];

    const firstResult = getColoredGraphResult({
      cache,
      filteredData,
      key: 'source-files',
      legends,
    });
    const secondResult = getColoredGraphResult({
      cache,
      filteredData,
      key: 'source-files',
      legends,
    });

    expect(firstResult).not.toBe(filteredData);
    expect(firstResult?.nodes[0]?.color).toBe('#f9a8d4');
    expect(secondResult).toBe(firstResult);
  });

  it('keeps cached colored results isolated by key', () => {
    const cache = createReferenceResultCache<IGraphData>();
    const filteredData = createGraphData();
    const firstLegend = createLegend('source-files', '#f9a8d4');
    const secondLegend = createLegend('all-files', '#67e8f9');

    const firstResult = getColoredGraphResult({
      cache,
      filteredData,
      key: 'source-files',
      legends: [firstLegend],
    });
    const secondResult = getColoredGraphResult({
      cache,
      filteredData,
      key: 'all-files',
      legends: [secondLegend],
    });

    expect(firstResult?.nodes[0]?.color).toBe('#f9a8d4');
    expect(secondResult?.nodes[0]?.color).toBe('#67e8f9');
    expect(secondResult).not.toBe(firstResult);
  });
});

function createGraphData(): IGraphData {
  return {
    nodes: [
      {
        id: 'src/app.ts',
        label: 'app.ts',
        color: '#94a3b8',
      },
    ],
    edges: [],
  };
}

function createLegend(id: string, color: string): IGroup {
  return {
    id,
    pattern: 'src/**',
    color,
  };
}
