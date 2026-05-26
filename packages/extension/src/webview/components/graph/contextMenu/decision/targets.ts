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

function normalizeGraphContextNodeSource(
  nodeId: string,
  source: GraphContextNodeSource | string | undefined,
  symbol: GraphContextNodeSource['symbol'] | undefined,
  isCollapsed: boolean | undefined,
): GraphContextNodeSource | undefined {
  return typeof source === 'string'
    ? { id: nodeId, isCollapsed, nodeType: source, symbol }
    : source;
}

function resolveGraphContextNodeType(
  nodeId: string,
  source: GraphContextNodeSource | undefined,
): string {
  return isPackageNodeId(nodeId) ? 'package' : source?.nodeType ?? 'file';
}

function resolveGraphContextNodeKind(
  nodeType: string,
  source: GraphContextNodeSource | undefined,
): GraphContextNodeKind {
  if (source?.isGraphSection || nodeType === 'graph-section') {
    return 'graph-section';
  }

  return source?.symbol || nodeType === 'symbol' || nodeType === 'variable'
    ? 'symbol'
    : resolveNodeKind(nodeType);
}

function resolveCollapsedGraphSection(
  nodeKind: GraphContextNodeKind,
  source: GraphContextNodeSource | undefined,
): boolean | undefined {
  return nodeKind === 'graph-section' ? !!source?.isCollapsedGraphSection : undefined;
}

export function classifyGraphContextNodeTarget(
  nodeId: string,
  source: GraphContextNodeSource | string | undefined,
  symbol?: GraphContextNodeSource['symbol'],
  isCollapsed?: boolean,
): GraphContextNodeTarget {
  const nodeSource = normalizeGraphContextNodeSource(nodeId, source, symbol, isCollapsed);
  const resolvedNodeType = resolveGraphContextNodeType(nodeId, nodeSource);
  const resolvedSymbol = nodeSource?.symbol;
  const nodeKind = resolveGraphContextNodeKind(resolvedNodeType, nodeSource);

  return {
    id: nodeId,
    isCollapsed: nodeSource?.isCollapsed,
    isCollapsedGraphSection: resolveCollapsedGraphSection(nodeKind, nodeSource),
    nodeKind,
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
