export type GraphContextNodeKind = 'file' | 'folder' | 'package' | 'plugin' | 'symbol';

export interface GraphContextNodeTarget {
  id: string;
  isCollapsed?: boolean;
  nodeKind: GraphContextNodeKind;
  nodeType: string;
  ownerPluginId?: string;
  runtimeNodeType?: string;
  symbol?: {
    id: string;
    name: string;
    filePath: string;
  };
}

export interface GraphContextNodeSource {
  id: string;
  isCollapsed?: boolean;
  nodeType?: string;
  ownerPluginId?: string;
  runtimeNodeType?: string;
  symbol?: {
    id: string;
    name: string;
    filePath: string;
  };
}

export function isPackageNodeId(nodeId: string): boolean {
  return nodeId.startsWith('pkg:');
}

export function classifyGraphContextNodeTarget(
  nodeId: string,
  source: GraphContextNodeSource | string | undefined,
  symbol?: GraphContextNodeSource['symbol'],
  isCollapsed?: boolean,
): GraphContextNodeTarget {
  const nodeSource = typeof source === 'string'
    ? { id: nodeId, isCollapsed, nodeType: source, symbol }
    : source;
  const resolvedNodeType = isPackageNodeId(nodeId)
    ? 'package'
    : nodeSource?.nodeType ?? 'file';
  const resolvedSymbol = nodeSource?.symbol;
  return {
    id: nodeId,
    isCollapsed: nodeSource?.isCollapsed,
    nodeKind: resolvedSymbol || resolvedNodeType === 'symbol' || resolvedNodeType === 'variable'
        ? 'symbol'
        : resolveNodeKind(resolvedNodeType),
    nodeType: resolvedNodeType,
    ...(nodeSource?.ownerPluginId ? { ownerPluginId: nodeSource.ownerPluginId } : {}),
    ...(nodeSource?.runtimeNodeType ? { runtimeNodeType: nodeSource.runtimeNodeType } : {}),
    ...(resolvedSymbol ? { symbol: resolvedSymbol } : {}),
  };
}

export function classifyGraphContextNodeTargets(
  targetIds: readonly string[],
  nodes: readonly GraphContextNodeSource[] | undefined,
): GraphContextNodeTarget[] {
  const nodeSources = nodes ? createNodeSourceMap(nodes) : undefined;
  return targetIds.map(targetId =>
    classifyGraphContextNodeTarget(targetId, nodeSources?.get(targetId))
  );
}

function createNodeSourceMap(nodes: readonly GraphContextNodeSource[]): Map<string, GraphContextNodeSource> {
  return new Map(nodes.map(node => [node.id, node]));
}

function resolveNodeKind(nodeType: string): GraphContextNodeKind {
  if (nodeType === 'file' || nodeType === 'folder' || nodeType === 'package') {
    return nodeType;
  }

  return 'plugin';
}
