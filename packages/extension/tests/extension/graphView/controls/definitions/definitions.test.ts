import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mergeEdgeTypes, mergeNodeTypes } from '../../../../../src/extension/graphView/controls/send/definitions/merge';
import { STRUCTURAL_NESTS_EDGE_KIND } from '../../../../../src/shared/graphControls/defaults/definitions';
import { normalizeHexColor } from '../../../../../src/shared/fileColors';
import { prettifyIdentifier } from '../../../../../src/extension/graphView/controls/send/definitions/identifiers';

vi.mock('../../../../../src/shared/fileColors', async () => {
  const actual = await vi.importActual('../../../../../src/shared/fileColors');
  return {
    ...actual,
    normalizeHexColor: vi.fn(),
  };
});

vi.mock('../../../../../src/extension/graphView/controls/send/definitions/identifiers', () => ({
  prettifyIdentifier: vi.fn(),
}));

describe('extension/graphView/controls/send/definitions/merge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(normalizeHexColor).mockImplementation((value, fallback) => value || fallback);
    vi.mocked(prettifyIdentifier).mockImplementation((value: string) => `Pretty ${value}`);
  });

  it('merges structural and capability-declared node types while normalizing the folder color', () => {
    const graphData = {
      nodes: [
        { id: 'src/app.ts', nodeType: 'service', color: '#123456' },
        { id: 'src/folder', nodeType: undefined, color: '#654321' },
        { id: 'src/ignored', nodeType: 'pluginNode', color: '#abcdef' },
        { id: 'src/defaultColor', nodeType: 'background' },
      ],
      edges: [],
    };

    const definitions = mergeNodeTypes(
      graphData as never,
      [
        {
          id: 'pluginNode',
          label: 'Plugin Node',
          defaultColor: '#999999',
          defaultVisible: false,
        },
      ] as never,
      { folder: '#ABCDEF' },
      ['pluginNode', 'symbol:function'],
    );

    expect(normalizeHexColor).toHaveBeenCalled();
    expect(definitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'folder', defaultColor: '#ABCDEF' }),
        expect.objectContaining({ id: 'pluginNode', label: 'Plugin Node', defaultVisible: false }),
        expect.objectContaining({ id: 'symbol', label: 'Symbol', defaultVisible: false }),
        expect.objectContaining({ id: 'symbol:function', label: 'Function', defaultVisible: false }),
      ]),
    );
    expect(definitions.find((definition) => definition.id === 'file')?.defaultColor).not.toBe('#ABCDEF');
    expect(definitions.find((definition) => definition.id === 'symbol')?.defaultColor).not.toBe('#ABCDEF');
    expect(definitions.some((definition) => definition.id === 'service')).toBe(false);
    expect(definitions.some((definition) => definition.id === 'background')).toBe(false);
    expect(prettifyIdentifier).not.toHaveBeenCalled();
  });

  it('shows parent rows for plugin-owned child node types', () => {
    const definitions = mergeNodeTypes(
      { nodes: [], edges: [] } as never,
      [
        {
          id: 'plugin:test:symbol:concept',
          label: 'Concept',
          defaultColor: '#999999',
          defaultVisible: false,
          parentId: 'symbol',
        },
      ],
      {},
      ['plugin:test:symbol:concept'],
    );

    expect(definitions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'symbol' }),
      expect.objectContaining({ id: 'plugin:test:symbol:concept', parentId: 'symbol' }),
    ]));
  });

  it('walks nested plugin parent node rows until all parents are visible', () => {
    const definitions = mergeNodeTypes(
      { nodes: [], edges: [] } as never,
      [
        {
          id: 'plugin:test:symbol',
          label: 'Plugin Symbol',
          defaultColor: '#777777',
          defaultVisible: false,
          parentId: 'symbol',
        },
        {
          id: 'plugin:test:symbol:concept',
          label: 'Concept',
          defaultColor: '#999999',
          defaultVisible: false,
          parentId: 'plugin:test:symbol',
        },
      ],
      {},
      ['plugin:test:symbol:concept'],
    );

    expect(definitions.map((definition) => definition.id)).toEqual(expect.arrayContaining([
      'symbol',
      'plugin:test:symbol',
      'plugin:test:symbol:concept',
    ]));
  });

  it('keeps only structural node rows when no capabilities are available', () => {
    const definitions = mergeNodeTypes(
      { nodes: [], edges: [] } as never,
      [
        {
          id: 'pluginNode',
          label: 'Plugin Node',
          defaultColor: '#999999',
          defaultVisible: false,
        },
      ] as never,
      {},
      [],
    );

    expect(definitions.map((definition) => definition.id)).toEqual([
      'file',
      'folder',
      'package',
    ]);
  });

  it('keeps structural node rows when capabilities are omitted', () => {
    const definitions = mergeNodeTypes(
      { nodes: [], edges: [] } as never,
      [],
      {},
    );

    expect(definitions.map((definition) => definition.id)).toEqual([
      'file',
      'folder',
      'package',
    ]);
  });

  it('merges plugin and inferred edge types while preserving core entries', () => {
    const graphData = {
      nodes: [],
      edges: [
        { id: 'a-b', kind: 'dynamicImport', color: '#112233' },
        { id: 'b-c', kind: 'unstyled' },
        { id: 'c-d', kind: 'pluginEdge', color: '#999999' },
      ],
    };

    const definitions = mergeEdgeTypes(
      graphData as never,
      [
        {
          id: 'pluginEdge',
          label: 'Plugin Edge',
          defaultColor: '#445566',
          defaultVisible: false,
        },
      ] as never,
    );

    expect(definitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'pluginEdge', label: 'Plugin Edge', defaultColor: '#445566', defaultVisible: false }),
        expect.objectContaining({ id: 'dynamicImport', label: 'Pretty dynamicImport', defaultColor: '#112233', defaultVisible: true }),
        expect.objectContaining({ id: 'unstyled', label: 'Pretty unstyled', defaultColor: '#94A3B8', defaultVisible: true }),
      ]),
    );
    expect(definitions.find((definition) => String(definition.id) === 'dynamicImport')).not.toHaveProperty('requiresEdgeType');
    expect(definitions.find((definition) => String(definition.id) === 'unstyled')).not.toHaveProperty('requiresEdgeType');
    expect(prettifyIdentifier).toHaveBeenCalledWith('dynamicImport');
    expect(prettifyIdentifier).toHaveBeenCalledWith('unstyled');
  });

  it('does not include plugin edge definitions that are unavailable in capabilities or graph data', () => {
    const definitions = mergeEdgeTypes(
      { nodes: [], edges: [] } as never,
      [
        {
          id: 'pluginEdge',
          label: 'Plugin Edge',
          defaultColor: '#445566',
          defaultVisible: false,
        },
      ] as never,
      ['call'],
    );

    expect(definitions.map((definition) => definition.id)).toEqual(['call']);
  });

  it('does not infer graph edge rows outside declared capabilities', () => {
    const definitions = mergeEdgeTypes(
      {
        nodes: [{ id: 'src/app.ts', nodeType: 'file' }],
        edges: [
          { id: 'a-b', kind: 'import' },
          { id: 'b-c', kind: 'reference' },
        ],
      } as never,
      [],
      ['import', 'type-import', 'call', 'inherit', 'contains'],
    );

    expect(definitions.map((definition) => definition.id)).toEqual([
      'import',
      'call',
      'type-import',
      'inherit',
      STRUCTURAL_NESTS_EDGE_KIND,
      'contains',
    ]);
  });

  it('marks inferred overrides edges as requiring inherits visibility', () => {
    const definitions = mergeEdgeTypes(
      {
        nodes: [],
        edges: [{ id: 'a-b', kind: 'overrides' }],
      } as never,
      [],
    );

    expect(definitions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'overrides',
        requiresEdgeType: 'inherit',
      }),
    ]));
  });

  it('does not add legacy reference for C++ capability shape', () => {
    const definitions = mergeEdgeTypes(
      {
        nodes: [{ id: 'src/app.cpp', nodeType: 'file' }],
        edges: [],
      } as never,
      [],
      ['include', 'overrides'],
    );

    expect(definitions.map((definition) => definition.id)).toEqual([
      'include',
      STRUCTURAL_NESTS_EDGE_KIND,
      'overrides',
    ]);
    expect(definitions.find((definition) => definition.id === 'overrides')).not.toHaveProperty('requiresEdgeType');
  });

  it('adds legacy reference and structural edges for file graphs without C++ override shape', () => {
    const definitions = mergeEdgeTypes(
      {
        nodes: [{ id: 'src/app.ts', nodeType: 'file' }],
        edges: [
          { id: 'a-b', kind: 'import' },
          { id: 'b-c', kind: 'pluginEdge' },
        ],
      } as never,
      [
        {
          id: 'pluginEdge',
          label: 'Plugin Edge',
          defaultColor: '#445566',
          defaultVisible: false,
        },
      ] as never,
      ['reference'],
    );

    expect(definitions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'reference' }),
      expect.objectContaining({ id: STRUCTURAL_NESTS_EDGE_KIND }),
      expect.objectContaining({ id: 'pluginEdge' }),
    ]));
    expect(definitions.some((definition) => definition.id === 'import')).toBe(false);
  });

  it('adds legacy reference when edge capabilities are omitted for file graphs', () => {
    const definitions = mergeEdgeTypes(
      {
        nodes: [{ id: 'src/app.ts', nodeType: 'file' }],
        edges: [],
      } as never,
      [],
    );

    expect(definitions.map((definition) => definition.id)).toEqual([
      'reference',
      STRUCTURAL_NESTS_EDGE_KIND,
    ]);
  });

  it('adds legacy reference when only include capabilities are available', () => {
    const definitions = mergeEdgeTypes(
      {
        nodes: [{ id: 'src/app.cpp', nodeType: 'file' }],
        edges: [],
      } as never,
      [],
      ['include'],
    );

    expect(definitions.map((definition) => definition.id)).toEqual([
      'include',
      'reference',
      STRUCTURAL_NESTS_EDGE_KIND,
    ]);
    expect(definitions.find((definition) => definition.id === 'reference')).not.toHaveProperty('requiresEdgeType');
  });

  it('does not add legacy reference for override-only capabilities', () => {
    const definitions = mergeEdgeTypes(
      {
        nodes: [{ id: 'src/app.cpp', nodeType: 'file' }],
        edges: [],
      } as never,
      [],
      ['overrides'],
    );

    expect(definitions.map((definition) => definition.id)).toEqual([
      STRUCTURAL_NESTS_EDGE_KIND,
      'overrides',
    ]);
  });

  it('does not infer structural file edges when graph data has no file nodes', () => {
    const definitions = mergeEdgeTypes(
      {
        nodes: [{ id: 'symbol', nodeType: 'symbol' }],
        edges: [],
      } as never,
      [],
      [],
    );

    expect(definitions).toEqual([]);
  });
});
