import { describe, expect, it, vi } from 'vitest';
import type { IGraphNode } from '../../../../src/shared/graph/contracts';
import {
  applyNodeTypeColors,
  getFileNodes,
  getFolderNodes,
  isNodeVisible,
  withResolvedNodeTypes,
} from '../../../../src/webview/graphControls/filtering/nodes';
import {
  DEFAULT_FOLDER_NODE_COLOR,
  DEFAULT_NODE_COLOR,
  DEFAULT_PACKAGE_NODE_COLOR,
} from '../../../../src/shared/fileColors';

function node(id: string, nodeType?: string, color = ''): IGraphNode {
  return {
    id,
    label: id,
    color,
    ...(nodeType ? { nodeType } : {}),
  };
}

function symbolNode(id: string, kind: string, nodeType = 'symbol'): IGraphNode {
  return {
    ...node(id, nodeType),
    symbol: {
      id,
      name: id,
      kind,
      filePath: 'src/logger/logger.h',
    },
  };
}

const nodes: IGraphNode[] = [
  node('a.ts'),
  node('src', 'folder'),
  node('packages/app', 'package'),
  node('route', 'plugin-route', '#route'),
];

describe('webview/graphControls/filtering nodes', () => {
  it('treats missing node types as file nodes for visibility', () => {
    expect(isNodeVisible(node('a.ts'), { file: false })).toBe(false);
    expect(isNodeVisible(node('src', 'folder'), { folder: true })).toBe(true);
    expect(isNodeVisible(node('route', 'plugin-route'), {})).toBe(true);
  });

  it('hides plugin-scoped node types unless explicitly enabled', () => {
    const unityNode = node('scene', 'plugin:codegraphy.unity:symbol:game-object');
    expect(isNodeVisible(unityNode, {})).toBe(false);
    expect(isNodeVisible(unityNode, { 'plugin:codegraphy.unity:symbol:game-object': true })).toBe(true);
  });

  it('resolves missing node types to file without mutating the source nodes', () => {
    const resolved = withResolvedNodeTypes(nodes);

    expect(resolved.map((item) => item.nodeType)).toEqual([
      'file',
      'folder',
      'package',
      'plugin-route',
    ]);
    expect(nodes[0].nodeType).toBeUndefined();
  });

  it('applies configured node colors before existing and fallback colors', () => {
    expect(applyNodeTypeColors(nodes, {
      file: '#file',
      'plugin-route': '#plugin-route',
    })).toEqual([
      { ...node('a.ts'), color: '#file' },
      { ...node('src', 'folder'), color: DEFAULT_FOLDER_NODE_COLOR },
      { ...node('packages/app', 'package'), color: DEFAULT_PACKAGE_NODE_COLOR },
      { ...node('route', 'plugin-route', '#route'), color: '#plugin-route' },
    ]);
  });

  it('uses existing colors before generic fallback colors', () => {
    expect(applyNodeTypeColors([
      node('unknown', 'plugin-route', '#route'),
      node('plain'),
    ], {})).toEqual([
      node('unknown', 'plugin-route', '#route'),
      { ...node('plain'), color: DEFAULT_NODE_COLOR },
    ]);
  });

  it('applies the most-specific graph scope color for symbol and variable child nodes', () => {
    expect(applyNodeTypeColors([
      symbolNode('src/logger/logger.h#Logger:typedef', 'typedef'),
      symbolNode('src/logger/logger.c#logger_output_enabled:global', 'global', 'variable'),
    ], {
      symbol: '#symbol',
      variable: '#variable',
      'symbol:typedef': '#typedef',
      'symbol:global': '#global',
    })).toEqual([
      { ...symbolNode('src/logger/logger.h#Logger:typedef', 'typedef'), color: '#typedef' },
      { ...symbolNode('src/logger/logger.c#logger_output_enabled:global', 'global', 'variable'), color: '#global' },
    ]);
  });

  it('uses node-type-specific fallback colors when no color is configured', async () => {
    vi.resetModules();
    vi.doMock('../../../../src/shared/fileColors', () => ({
      DEFAULT_FOLDER_NODE_COLOR: '#folder',
      DEFAULT_NODE_COLOR: '#file',
      DEFAULT_PACKAGE_NODE_COLOR: '#package',
    }));

    try {
      const { applyNodeTypeColors: applyColors } = await import(
        '../../../../src/webview/graphControls/filtering/nodes'
      );

      expect(applyColors([
        node('src', 'folder'),
        node('packages/app', 'package'),
        node('a.ts'),
      ], {})).toEqual([
        { ...node('src', 'folder'), color: '#folder' },
        { ...node('packages/app', 'package'), color: '#package' },
        { ...node('a.ts'), color: '#file' },
      ]);
    } finally {
      vi.doUnmock('../../../../src/shared/fileColors');
      vi.resetModules();
    }
  });

  it('partitions file and folder nodes using resolved node types', () => {
    expect(getFileNodes(nodes).map((item) => item.id)).toEqual(['a.ts']);
    expect(getFolderNodes(nodes).map((item) => item.id)).toEqual(['src']);
  });
});
