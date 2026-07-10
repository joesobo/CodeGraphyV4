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
  graphMode: '2d' | '3d',
  nodes: readonly GraphContextMenuNode[] | undefined,
): GraphViewContextMenuRunContext {
  const selectedNodePositions = createSelectedNodePositions(selection, nodes);
  return {
    target: selector,
    graphMode,
    timelineActive: false,
    selectedNodeIds: selection.kind === 'node' ? selection.targets : [],
    selectedEdgeIds: selection.kind === 'edge' && selection.edgeId ? [selection.edgeId] : [],
    ...(selection.graphPosition ? { graphPosition: selection.graphPosition } : {}),
    ...(selectedNodePositions ? { selectedNodePositions } : {}),
  };
}
