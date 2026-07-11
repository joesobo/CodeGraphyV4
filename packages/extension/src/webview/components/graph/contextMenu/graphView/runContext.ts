import type {
  GraphContextMenuNode,
  GraphContextSelection,
} from '../contracts';
import type {
  GraphViewContextMenuRunContext,
  GraphViewContextMenuTargetSelector,
} from './model';
import { createSelectedNodePositions } from './selectedPositions';

export function createRunContext(
  selector: GraphViewContextMenuTargetSelector,
  selection: GraphContextSelection,
  timelineActive: boolean,
  nodes: readonly GraphContextMenuNode[] | undefined,
): GraphViewContextMenuRunContext {
  const selectedNodePositions = createSelectedNodePositions(selection, nodes);
  return {
    target: selector,
    timelineActive,
    selectedNodeIds: selection.kind === 'node' ? selection.targets : [],
    selectedEdgeIds: selection.kind === 'edge' && selection.edgeId ? [selection.edgeId] : [],
    ...(selection.graphPosition ? { graphPosition: selection.graphPosition } : {}),
    ...(selectedNodePositions ? { selectedNodePositions } : {}),
  };
}
