import type {
  GraphContextMenuIdentity,
  GraphContextMenuNode,
} from '../contracts';

export function buildGraphContextMenuIdentity(
  nodeId: string,
  nodes: readonly GraphContextMenuNode[] | undefined,
): GraphContextMenuIdentity {
  const label = nodes?.find(node => node.id === nodeId)?.label?.trim() || nodeId;
  return label === nodeId ? { label } : { label, exactId: nodeId };
}
