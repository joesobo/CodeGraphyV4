import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphNode } from '../../../../../../src/shared/graph/contracts';
import { doGraphViewGroupsNeedRecompute } from '../../../../../../src/extension/graphView/analysis/execution/publish/groupInputs';

type GraphNodeSymbol = NonNullable<IGraphNode['symbol']>;

function createSymbol(overrides: Partial<GraphNodeSymbol> = {}): GraphNodeSymbol {
  return {
    id: 'src/a.ts#Component',
    name: 'Component',
    kind: 'class',
    filePath: 'src/a.ts',
    pluginKind: 'typescript:class',
    source: 'typescript',
    language: 'typescript',
    ...overrides,
  };
}

function createNode(overrides: Partial<IGraphNode> = {}): IGraphNode {
  return {
    id: 'src/a.ts',
    label: 'a.ts',
    color: '#67E8F9',
    nodeType: 'file',
    ...overrides,
  };
}

function createGraph(nodes: IGraphNode[]): IGraphData {
  return {
    nodes,
    edges: [],
  };
}

describe('extension/graphView/analysis/execution/publish/groupInputs', () => {
  it('keeps graph view groups when node group inputs are unchanged', () => {
    expect(
      doGraphViewGroupsNeedRecompute(
        createGraph([
          createNode({ id: 'src/a.ts', symbol: createSymbol({ filePath: 'src/a.ts' }) }),
          createNode({ id: 'src/b.ts', symbol: createSymbol({ id: 'src/b.ts#Component', filePath: 'src/b.ts' }) }),
        ]),
        createGraph([
          createNode({ id: 'src/b.ts', symbol: createSymbol({ id: 'src/b.ts#Component', filePath: 'src/b.ts' }) }),
          createNode({ id: 'src/a.ts', symbol: createSymbol({ filePath: 'src/a.ts' }) }),
        ]),
      ),
    ).toBe(false);
  });

  it('recomputes graph view groups when the next graph adds a node', () => {
    expect(
      doGraphViewGroupsNeedRecompute(
        createGraph([createNode()]),
        createGraph([createNode(), createNode({ id: 'src/b.ts' })]),
      ),
    ).toBe(true);
  });

  it('recomputes graph view groups when a current node id is absent', () => {
    expect(
      doGraphViewGroupsNeedRecompute(
        createGraph([createNode({ id: 'src/a.ts' })]),
        createGraph([createNode({ id: 'src/b.ts' })]),
      ),
    ).toBe(true);
  });

  it('recomputes graph view groups when node type changes', () => {
    expect(
      doGraphViewGroupsNeedRecompute(
        createGraph([createNode({ nodeType: 'file' })]),
        createGraph([createNode({ nodeType: 'symbol' })]),
      ),
    ).toBe(true);
  });

  it('recomputes graph view groups when symbol presence changes', () => {
    expect(
      doGraphViewGroupsNeedRecompute(
        createGraph([createNode()]),
        createGraph([createNode({ symbol: createSymbol() })]),
      ),
    ).toBe(true);
  });

  it.each([
    ['kind', { kind: 'function' }],
    ['plugin kind', { pluginKind: 'typescript:function' }],
    ['source', { source: 'markdown' }],
    ['language', { language: 'markdown' }],
    ['file path', { filePath: 'src/b.ts' }],
  ] as const)('recomputes graph view groups when symbol %s changes', (_field, symbolOverrides) => {
    expect(
      doGraphViewGroupsNeedRecompute(
        createGraph([createNode({ symbol: createSymbol() })]),
        createGraph([createNode({ symbol: createSymbol(symbolOverrides) })]),
      ),
    ).toBe(true);
  });

  it('keeps graph view groups when symbol display details change', () => {
    expect(
      doGraphViewGroupsNeedRecompute(
        createGraph([createNode({ symbol: createSymbol() })]),
        createGraph([createNode({
          symbol: createSymbol({
            id: 'src/a.ts#RenamedComponent',
            name: 'RenamedComponent',
            range: { startLine: 10, endLine: 20 },
            signature: 'class RenamedComponent',
          }),
        })]),
      ),
    ).toBe(false);
  });
});
