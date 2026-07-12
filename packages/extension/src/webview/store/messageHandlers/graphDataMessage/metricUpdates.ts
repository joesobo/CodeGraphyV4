import type { NodeSizeMode } from '../../../../shared/settings/modes';
import type {
  GraphNode,
  GraphNodeMetricsUpdate,
} from './contracts';

export function nodeSizeModeUsesNodeMetrics(mode: NodeSizeMode): boolean {
  return mode === 'file-size';
}

export function applyMetricUpdatesInPlace(
  graphData: { nodes: GraphNode[] },
  updatesById: ReadonlyMap<string, GraphNodeMetricsUpdate>,
): boolean {
  let changed = false;

  for (const node of graphData.nodes) {
    const update = updatesById.get(node.id);
    if (!update || !nodeMetricsDiffer(node, update)) {
      continue;
    }

    node.fileSize = update.fileSize;
    changed = true;
  }

  return changed;
}

export function applyMetricUpdates(
  nodes: readonly GraphNode[],
  updatesById: ReadonlyMap<string, GraphNodeMetricsUpdate>,
): { changed: boolean; nodes: GraphNode[] } {
  let changed = false;
  const nextNodes = nodes.map((node) => {
    const update = updatesById.get(node.id);
    if (!update || !nodeMetricsDiffer(node, update)) {
      return node;
    }

    changed = true;
    return {
      ...node,
      fileSize: update.fileSize,
    };
  });

  return { changed, nodes: nextNodes };
}

function nodeMetricsDiffer(node: GraphNode, update: GraphNodeMetricsUpdate): boolean {
  return node.fileSize !== update.fileSize;
}
