export type GraphContextNodeKind = 'file' | 'folder' | 'package' | 'plugin' | 'symbol' | 'graph-section';

export interface GraphContextNodeTarget {
  id: string;
  isCollapsed?: boolean;
  isCollapsedGraphSection?: boolean;
  nodeKind: GraphContextNodeKind;
  nodeType: string;
  symbol?: {
    id: string;
    name: string;
    filePath: string;
  };
}

export interface GraphContextNodeSource {
  id: string;
  isCollapsed?: boolean;
  isCollapsedGraphSection?: boolean;
  isGraphSection?: boolean;
  nodeType?: string;
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
  const isGraphSection = nodeSource?.isGraphSection || resolvedNodeType === 'graph-section';

  return {
    id: nodeId,
    isCollapsed: nodeSource?.isCollapsed,
    isCollapsedGraphSection: isGraphSection
      ? !!nodeSource?.isCollapsedGraphSection
      : undefined,
    nodeKind: isGraphSection
      ? 'graph-section'
      : resolvedSymbol || resolvedNodeType === 'symbol' || resolvedNodeType === 'variable'
        ? 'symbol'
        : resolveNodeKind(resolvedNodeType),
    nodeType: resolvedNodeType,
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
