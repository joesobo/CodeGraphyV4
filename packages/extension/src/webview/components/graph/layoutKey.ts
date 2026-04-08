import type { NodeSizeMode } from '../../../shared/settings/modes';
import type { UseGraphStateResult } from './runtime/use/graph/state';

export function buildGraphLayoutKey(
  graphData: UseGraphStateResult['graphData'],
  nodeSizeMode: NodeSizeMode,
): string {
  const nodeIds = graphData.nodes.map(node => node.id).join('|');
  const linkIds = graphData.links.map(link => link.id).join('|');
  return `${nodeSizeMode}::${nodeIds}::${linkIds}`;
}
