import { describe, expect, it } from 'vitest';
import type { IGraphEdge, IGraphNode } from '../../src/graph/contracts';
import {
  DEFAULT_FILE_NODE_TYPE,
  filterEdgesToNodes,
  getDisabledTypes,
  getEnabledTypes,
  getNodeType,
  isFileNode,
} from '../../src/visibleGraph/model';

function node(id: string, nodeType?: IGraphNode['nodeType']): IGraphNode {
  return {
    id,
    label: id,
    ...(nodeType ? { nodeType } : {}),
  };
}

function edge(from: string, to: string): IGraphEdge {
  return {
    id: `${from}->${to}#import`,
    from,
    to,
    kind: 'import',
    sources: [],
  };
}

describe('visibleGraph/model', () => {
  it('treats missing node types as file nodes', () => {
    expect(getNodeType(node('src/app.ts'))).toBe(DEFAULT_FILE_NODE_TYPE);
    expect(isFileNode(node('src/app.ts'))).toBe(true);
    expect(isFileNode(node('src', 'folder'))).toBe(false);
  });

  it('collects enabled and disabled scope item types', () => {
    const items = [
      { type: 'file', enabled: true },
      { type: 'folder', enabled: false },
      { type: 'import', enabled: true },
    ];

    expect(getEnabledTypes(items)).toEqual(new Set(['file', 'import']));
    expect(getDisabledTypes(items)).toEqual(new Set(['folder']));
  });

  it('keeps only edges whose endpoints remain visible', () => {
    expect(filterEdgesToNodes(
      [
        edge('src/a.ts', 'src/b.ts'),
        edge('src/a.ts', 'src/missing.ts'),
        edge('src/missing.ts', 'src/b.ts'),
      ],
      [
        node('src/a.ts'),
        node('src/b.ts'),
      ],
    )).toEqual([
      edge('src/a.ts', 'src/b.ts'),
    ]);
  });
});
