import {
  getMarqueeBounds,
  getMarqueeSelectedNodeIds,
} from '../../../../marqueeSelection/model';
import type {
  GraphMarqueeSelectionRuntimeOptions,
  MarqueeDragState,
} from './state';

function toggleMarqueeSelection(
  currentNodeIds: ReadonlySet<string>,
  marqueeNodeIds: readonly string[],
): string[] {
  const selectedNodeIds = new Set(currentNodeIds);
  for (const nodeId of marqueeNodeIds) {
    if (selectedNodeIds.has(nodeId)) {
      selectedNodeIds.delete(nodeId);
    } else {
      selectedNodeIds.add(nodeId);
    }
  }

  return [...selectedNodeIds];
}

export function selectMarqueeNodes(
  drag: MarqueeDragState,
  options: Pick<
    GraphMarqueeSelectionRuntimeOptions,
    'fg2dRef' | 'graphDataRef' | 'interactionHandlers' | 'selectedNodesSetRef'
  >,
): void {
  const graph = options.fg2dRef.current;
  const marqueeNodeIds = getMarqueeSelectedNodeIds({
    bounds: getMarqueeBounds(drag.start, drag.current),
    graphToScreen: (x, y) => graph?.graph2ScreenCoords?.(x, y) ?? { x, y },
    nodes: options.graphDataRef.current.nodes,
  });
  const selectedNodeIds = drag.additive
    ? toggleMarqueeSelection(options.selectedNodesSetRef.current, marqueeNodeIds)
    : marqueeNodeIds;
  options.interactionHandlers.setHighlight(null);
  options.interactionHandlers.setSelection(selectedNodeIds);
}
