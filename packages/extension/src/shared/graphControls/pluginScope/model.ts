export function isPluginScopedGraphNodeType(nodeType: string): boolean {
  return nodeType.startsWith('plugin:');
}

export function isPluginScopedGraphEdgeKind(edgeKind: string): boolean {
  return edgeKind.includes(':');
}
