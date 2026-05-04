export type GraphContextNodeKind = 'file' | 'folder' | 'package' | 'plugin';

export interface GraphContextNodeTarget {
  id: string;
  nodeKind: GraphContextNodeKind;
  nodeType: string;
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

function resolveNodeKind(nodeType: string): GraphContextNodeKind {
  if (nodeType === 'file' || nodeType === 'folder' || nodeType === 'package') {
    return nodeType;
  }

  return 'plugin';
}
