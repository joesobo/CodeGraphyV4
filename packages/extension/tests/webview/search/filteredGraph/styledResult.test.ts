import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import type { IGraphEdgeTypeDefinition } from '../../../../src/shared/graphControls/contracts';
import { createReferenceResultCache } from '../../../../src/webview/search/filteredGraph/referenceCache';
import { getStyledGraphResult } from '../../../../src/webview/search/filteredGraph/styledResult';

describe('webview/search/filteredGraph/styledResult', () => {
  it('returns null when there is no visible graph data', () => {
    const result = getStyledGraphResult({
      cache: createReferenceResultCache(),
      edgeTypes: [],
      graph: null,
      key: 'styles',
      nodeColors: {},
    });

    expect(result).toBeNull();
  });

  it('applies node and edge colors and caches the styled result by graph reference and key', () => {
    const cache = createReferenceResultCache<IGraphData>();
    const graph = createGraphData();
    const edgeTypes = [createEdgeType('import', '#38bdf8')];

    const firstResult = getStyledGraphResult({
      cache,
      edgeTypes,
      graph,
      key: 'blue-files',
      nodeColors: {
        file: '#a7f3d0',
      },
    });
    const secondResult = getStyledGraphResult({
      cache,
      edgeTypes,
      graph,
      key: 'blue-files',
      nodeColors: {
        file: '#a7f3d0',
      },
    });

    expect(firstResult).not.toBe(graph);
    expect(firstResult?.nodes[0]).toMatchObject({
      color: '#a7f3d0',
      nodeType: 'file',
    });
    expect(firstResult?.edges[0]?.color).toBe('#38bdf8');
    expect(secondResult).toBe(firstResult);
  });

  it('keeps cached styled results isolated by key', () => {
    const cache = createReferenceResultCache<IGraphData>();
    const graph = createGraphData();

    const firstResult = getStyledGraphResult({
      cache,
      edgeTypes: [createEdgeType('import', '#38bdf8')],
      graph,
      key: 'blue-imports',
      nodeColors: {
        file: '#a7f3d0',
      },
    });
    const secondResult = getStyledGraphResult({
      cache,
      edgeTypes: [createEdgeType('import', '#fca5a5')],
      graph,
      key: 'red-imports',
      nodeColors: {
        file: '#fde047',
      },
    });

    expect(firstResult?.nodes[0]?.color).toBe('#a7f3d0');
    expect(firstResult?.edges[0]?.color).toBe('#38bdf8');
    expect(secondResult?.nodes[0]?.color).toBe('#fde047');
    expect(secondResult?.edges[0]?.color).toBe('#fca5a5');
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
      {
        id: 'src/util.ts',
        label: 'util.ts',
        color: '#94a3b8',
      },
    ],
    edges: [
      {
        id: 'src/app.ts->src/util.ts#import',
        from: 'src/app.ts',
        to: 'src/util.ts',
        kind: 'import',
        sources: [],
      },
    ],
  };
}

function createEdgeType(
  id: IGraphEdgeTypeDefinition['id'],
  defaultColor: string,
): IGraphEdgeTypeDefinition {
  return {
    id,
    label: id,
    defaultColor,
    defaultVisible: true,
  };
}
