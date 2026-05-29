import type { NodeSizeMode } from '../../../../shared/settings/modes';
import type { GraphRuntime } from '../runtime/use/state';

export function buildGraphDataLayoutKey(
  graphData: GraphRuntime['graphData'],
  nodeSizeMode: NodeSizeMode,
): string {
  const nodeIds = graphData.nodes.map(node => node.id).join('|');
  const linkIds = graphData.links.map(link => link.id).join('|');
  return `${nodeSizeMode}::${nodeIds}::${linkIds}`;
}
