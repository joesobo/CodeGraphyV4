import type { GraphContextNodeKind, GraphContextNodeSource } from './targets';

export function resolveGraphContextNodeSource(
  nodeId: string,
  source: GraphContextNodeSource | string | undefined,
  symbol?: GraphContextNodeSource['symbol'],
  isCollapsed?: boolean,
): GraphContextNodeSource | undefined {
  return typeof source === 'string' ? { id: nodeId, isCollapsed, nodeType: source, symbol } : source;
}

export function resolveGraphContextNodeKind(nodeType: string, symbol?: GraphContextNodeSource['symbol']): GraphContextNodeKind {
  if (symbol || nodeType === 'symbol' || nodeType === 'variable') return 'symbol';
  if (nodeType === 'file' || nodeType === 'folder' || nodeType === 'package') return nodeType;
  return 'plugin';
}
