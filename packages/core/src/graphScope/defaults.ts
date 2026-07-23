export function isPluginScopedGraphNodeType(nodeType: string): boolean {
  return nodeType.startsWith('plugin:');
}

export function isPluginScopedGraphEdgeKind(edgeKind: string): boolean {
  return edgeKind.includes(':');
}

export const CORE_GRAPH_EDGE_TYPES = [
  'call',
  'contains',
  'event',
  'implements',
  'import',
  'include',
  'inherit',
  'load',
  'nests',
  'overrides',
  'reference',
  'type',
  'type-import',
  'using',
] as const;

export const CORE_GRAPH_EDGE_DEFAULT_VISIBILITY: Record<string, boolean> = {
  include: true,
  import: true,
  using: true,
  nests: true,
  call: false,
  contains: false,
  event: false,
  implements: false,
  inherit: false,
  load: false,
  overrides: false,
  reference: false,
  type: false,
  'type-import': false,
};
