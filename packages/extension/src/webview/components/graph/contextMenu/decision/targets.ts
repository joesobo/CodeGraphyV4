export type GraphContextNodeKind = 'file' | 'folder' | 'package' | 'plugin' | 'graph-section';

export interface GraphContextNodeTarget {
  id: string;
  isCollapsedGraphSection?: boolean;
  nodeKind: GraphContextNodeKind;
  nodeType: string;
}

export interface GraphContextNodeSource {
  id: string;
  isCollapsedGraphSection?: boolean;
  isGraphSection?: boolean;
  nodeType?: string;
}

export function isPackageNodeId(nodeId: string): boolean {
  return nodeId.startsWith('pkg:');
}

export function classifyGraphContextNodeTarget(
  nodeId: string,
  source: GraphContextNodeSource | string | undefined,
): GraphContextNodeTarget {
  const nodeSource = typeof source === 'string' ? { id: nodeId, nodeType: source } : source;
  const resolvedNodeType = isPackageNodeId(nodeId)
    ? 'package'
    : nodeSource?.nodeType ?? 'file';
  const isGraphSection = nodeSource?.isGraphSection || resolvedNodeType === 'graph-section';

  return {
    id: nodeId,
    isCollapsedGraphSection: isGraphSection
      ? !!nodeSource?.isCollapsedGraphSection
      : undefined,
    nodeKind: isGraphSection ? 'graph-section' : resolveNodeKind(resolvedNodeType),
    nodeType: resolvedNodeType,
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
