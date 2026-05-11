export type GraphContextNodeKind = 'file' | 'folder' | 'package' | 'plugin';

export interface GraphContextNodeTarget {
  id: string;
  nodeKind: GraphContextNodeKind;
  nodeType: string;
  isCollapsed?: boolean;
}

export interface GraphContextNodeSource {
  id: string;
  nodeType?: string;
  isCollapsed?: boolean;
}

export function isPackageNodeId(nodeId: string): boolean {
  return nodeId.startsWith('pkg:');
}

export function classifyGraphContextNodeTarget(
  nodeId: string,
  nodeType: string | undefined,
  isCollapsed?: boolean,
): GraphContextNodeTarget {
  const resolvedNodeType = isPackageNodeId(nodeId)
    ? 'package'
    : nodeType ?? 'file';

  return {
    id: nodeId,
    nodeKind: resolveNodeKind(resolvedNodeType),
    nodeType: resolvedNodeType,
    isCollapsed,
  };
}

export function classifyGraphContextNodeTargets(
  targetIds: readonly string[],
  nodes: readonly GraphContextNodeSource[] | undefined,
): GraphContextNodeTarget[] {
  const nodeTypes = nodes ? createNodeTypeMap(nodes) : undefined;
  return targetIds.map(targetId =>
    classifyGraphContextNodeTarget(targetId, nodeTypes?.get(targetId)?.nodeType, nodeTypes?.get(targetId)?.isCollapsed)
  );
}

function createNodeTypeMap(nodes: readonly GraphContextNodeSource[]): Map<string, { nodeType: string; isCollapsed?: boolean }> {
  return new Map(nodes.map(node => [
    node.id,
    { nodeType: node.nodeType ?? 'file', isCollapsed: node.isCollapsed },
  ]));
}

function resolveNodeKind(nodeType: string): GraphContextNodeKind {
  if (nodeType === 'file' || nodeType === 'folder' || nodeType === 'package') {
    return nodeType;
  }

  return 'plugin';
}
