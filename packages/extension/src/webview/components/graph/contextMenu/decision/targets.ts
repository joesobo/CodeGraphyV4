import { isPackageNodeId } from '../../model/node/identity';
import { resolveGraphContextNodeKind, resolveGraphContextNodeSource } from './targetClassification';

export { isPackageNodeId } from '../../model/node/identity';

export type GraphContextNodeKind = 'file' | 'folder' | 'package' | 'plugin' | 'symbol';

export interface GraphContextNodeTarget {
  id: string;
  isCollapsed?: boolean;
  nodeKind: GraphContextNodeKind;
  nodeType: string;
  ownerPluginId?: string;
  runtimeNodeType?: string;
  symbol?: {
    id: string;
    name: string;
    filePath: string;
  };
}

export interface GraphContextNodeSource {
  id: string;
  isCollapsed?: boolean;
  nodeType?: string;
  ownerPluginId?: string;
  runtimeNodeType?: string;
  symbol?: {
    id: string;
    name: string;
    filePath: string;
  };
}

export function classifyGraphContextNodeTarget(
  nodeId: string,
  source: GraphContextNodeSource | string | undefined,
  symbol?: GraphContextNodeSource['symbol'],
  isCollapsed?: boolean,
): GraphContextNodeTarget {
  const nodeSource = resolveGraphContextNodeSource(nodeId, source, symbol, isCollapsed);
  const resolvedNodeType = isPackageNodeId(nodeId)
    ? 'package'
    : nodeSource?.nodeType ?? 'file';
  const resolvedSymbol = nodeSource?.symbol;
  return {
    id: nodeId,
    isCollapsed: nodeSource?.isCollapsed,
    nodeKind: resolveGraphContextNodeKind(resolvedNodeType, resolvedSymbol),
    nodeType: resolvedNodeType,
    ...(nodeSource?.ownerPluginId ? { ownerPluginId: nodeSource.ownerPluginId } : {}),
    ...(nodeSource?.runtimeNodeType ? { runtimeNodeType: nodeSource.runtimeNodeType } : {}),
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
