export type GraphContextNodeKind = 'file' | 'folder' | 'package' | 'plugin';

export interface GraphContextNodeTarget {
  id: string;
  nodeKind: GraphContextNodeKind;
  nodeType: string;
}

export interface GraphContextNodeSource {
  id: string;
  nodeType?: string;
}

export function isPackageNodeId(nodeId: string): boolean {
  return nodeId.startsWith('pkg:');
}

export function classifyGraphContextNodeTarget(
  nodeId: string,
  nodeType: string | undefined
): GraphContextNodeTarget {
  const resolvedNodeType = isPackageNodeId(nodeId)
    ? 'package'
    : nodeType ?? 'file';

  return {
    id: nodeId,
    nodeKind: resolveNodeKind(resolvedNodeType),
    nodeType: resolvedNodeType,
  };
}

export function classifyGraphContextNodeTargets(
  targetIds: readonly string[],
  nodes: readonly GraphContextNodeSource[] | undefined,
): GraphContextNodeTarget[] {
  const nodeTypes = nodes ? createNodeTypeMap(nodes) : undefined;
  return targetIds.map(targetId =>
    classifyGraphContextNodeTarget(targetId, nodeTypes?.get(targetId))
  );
}

function createNodeTypeMap(nodes: readonly GraphContextNodeSource[]): Map<string, string> {
  return new Map(nodes.map(node => [node.id, node.nodeType ?? 'file']));
}

function resolveNodeKind(nodeType: string): GraphContextNodeKind {
  if (nodeType === 'file' || nodeType === 'folder' || nodeType === 'package') {
    return nodeType;
  }

  return 'plugin';
}
