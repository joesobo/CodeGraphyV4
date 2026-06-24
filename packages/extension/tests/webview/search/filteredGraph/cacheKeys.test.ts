import { describe, expect, it } from 'vitest';
import type {
  IGraphEdgeTypeDefinition,
  IGraphNodeTypeDefinition,
} from '../../../../src/shared/graphControls/contracts';
import type { IGroup } from '../../../../src/shared/settings/groups';
import {
  createLegendGraphCacheKey,
  createStyledGraphCacheKey,
  createVisibleGraphCacheKey,
} from '../../../../src/webview/search/filteredGraph/cacheKeys';

describe('webview/search/filteredGraph/cacheKeys', () => {
  it('builds styled graph keys from edge colors and sorted node colors', () => {
    const key = createStyledGraphCacheKey({
      edgeTypes: [
        createEdgeType('import', { defaultColor: '#93c5fd' }),
        createEdgeType('call', { defaultColor: '#fca5a5' }),
      ],
      nodeColors: {
        symbol: '#fde047',
        file: '#86efac',
      },
    });

    expect(JSON.parse(key)).toEqual({
      edgeTypes: [
        ['import', '#93c5fd'],
        ['call', '#fca5a5'],
      ],
      nodeColors: [
        ['file', '#86efac'],
        ['symbol', '#fde047'],
      ],
    });
  });

  it('keeps styled graph keys stable when node color insertion order changes', () => {
    const edgeTypes = [createEdgeType('import', { defaultColor: '#93c5fd' })];

    const firstKey = createStyledGraphCacheKey({
      edgeTypes,
      nodeColors: {
        symbol: '#fde047',
        file: '#86efac',
      },
    });
    const secondKey = createStyledGraphCacheKey({
      edgeTypes,
      nodeColors: {
        file: '#86efac',
        symbol: '#fde047',
      },
    });

    expect(firstKey).toBe(secondKey);
  });

  it('builds visible graph keys from filters, search, sorted visibility, and type defaults', () => {
    const key = createVisibleGraphCacheKey({
      edgeTypes: [
        createEdgeType('import', { defaultVisible: true }),
        createEdgeType('call', { defaultVisible: false }),
      ],
      edgeVisibility: {
        call: false,
        import: true,
      },
      filterPatterns: ['dist/**'],
      nodeTypes: [
        createNodeType('file', { defaultVisible: true }),
        createNodeType('symbol', { defaultVisible: false }),
      ],
      nodeVisibility: {
        symbol: false,
        file: true,
      },
      searchOptions: {
        matchCase: true,
        regex: false,
        wholeWord: true,
      },
      searchQuery: 'GraphView',
      showOrphans: false,
    });

    expect(JSON.parse(key)).toEqual({
      edgeTypes: [
        ['import', true],
        ['call', false],
      ],
      edgeVisibility: [
        ['call', false],
        ['import', true],
      ],
      filterPatterns: ['dist/**'],
      nodeTypes: [
        ['file', true],
        ['symbol', false],
      ],
      nodeVisibility: [
        ['file', true],
        ['symbol', false],
      ],
      searchOptions: {
        matchCase: true,
        regex: false,
        wholeWord: true,
      },
      searchQuery: 'GraphView',
      showOrphans: false,
    });
  });

  it('keeps visible graph keys stable when visibility insertion order changes', () => {
    const options = {
      edgeTypes: [createEdgeType('import', { defaultVisible: true })],
      filterPatterns: ['dist/**'],
      nodeTypes: [createNodeType('file', { defaultVisible: true })],
      searchOptions: {
        matchCase: false,
        regex: false,
        wholeWord: false,
      },
      searchQuery: '',
      showOrphans: true,
    };

    const firstKey = createVisibleGraphCacheKey({
      ...options,
      edgeVisibility: {
        type: true,
        import: false,
      },
      nodeVisibility: {
        symbol: false,
        file: true,
      },
    });
    const secondKey = createVisibleGraphCacheKey({
      ...options,
      edgeVisibility: {
        import: false,
        type: true,
      },
      nodeVisibility: {
        file: true,
        symbol: false,
      },
    });

    expect(firstKey).toBe(secondKey);
  });

  it('serializes legend rules for legend graph keys', () => {
    const legends: IGroup[] = [
      {
        id: 'highlight-tests',
        pattern: '**/*.test.ts',
        color: '#f9a8d4',
        target: 'node',
      },
    ];

    expect(JSON.parse(createLegendGraphCacheKey(legends))).toEqual(legends);
  });
});

function createEdgeType(
  id: IGraphEdgeTypeDefinition['id'],
  overrides: Partial<IGraphEdgeTypeDefinition> = {},
): IGraphEdgeTypeDefinition {
  return {
    id,
    label: id,
    defaultColor: '#94a3b8',
    defaultVisible: true,
    ...overrides,
  };
}

function createNodeType(
  id: IGraphNodeTypeDefinition['id'],
  overrides: Partial<IGraphNodeTypeDefinition> = {},
): IGraphNodeTypeDefinition {
  return {
    id,
    label: id,
    defaultColor: '#94a3b8',
    defaultVisible: true,
    ...overrides,
  };
}
