export type GraphContextNodeKind = 'file' | 'folder' | 'package' | 'plugin' | 'symbol';

export interface GraphContextNodeTarget {
  id: string;
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
  nodeType: string | undefined,
  symbol?: GraphContextNodeSource['symbol'],
): GraphContextNodeTarget {
  const resolvedNodeType = isPackageNodeId(nodeId)
    ? 'package'
    : nodeType ?? 'file';

  return {
    id: nodeId,
    nodeKind: symbol || resolvedNodeType === 'symbol' || resolvedNodeType === 'variable'
      ? 'symbol'
      : resolveNodeKind(resolvedNodeType),
    nodeType: resolvedNodeType,
    symbol,
  };
}

export function classifyGraphContextNodeTargets(
  targetIds: readonly string[],
  nodes: readonly GraphContextNodeSource[] | undefined,
): GraphContextNodeTarget[] {
  const nodeMap = nodes ? createNodeMap(nodes) : undefined;
  return targetIds.map(targetId =>
    classifyGraphContextNodeTarget(
      targetId,
      nodeMap?.get(targetId)?.nodeType,
      nodeMap?.get(targetId)?.symbol,
    )
  );
}

function createNodeMap(
  nodes: readonly GraphContextNodeSource[],
): Map<string, GraphContextNodeSource> {
  return new Map(nodes.map(node => [node.id, node]));
}

function resolveNodeKind(nodeType: string): GraphContextNodeKind {
  if (nodeType === 'file' || nodeType === 'folder' || nodeType === 'package') {
    return nodeType;
  }

  return 'plugin';
}
