import type {
  GraphInteractionEffect,
  GraphNodeClickCommand,
} from '../model';
import { toggleNodeSelection } from './selection';
import type { GraphNodeSingleClickOptions } from './singleClick';

function hasSelectionModifier(
  ctrlKey: boolean,
  shiftKey: boolean,
  metaKey: boolean,
): boolean {
  return ctrlKey || shiftKey || metaKey;
}

function isOnlySelectedNode(
  nodeId: string,
  selectedNodeIds: Iterable<string>,
): boolean {
  const selection = [...selectedNodeIds];
  return selection.length === 1 && selection[0] === nodeId;
}

export function buildNodeSingleClickSelectionResult(
  options: GraphNodeSingleClickOptions,
): Pick<GraphNodeClickCommand, 'effects' | 'nextLastClick'> {
  const effects: GraphInteractionEffect[] = [];
  let nextLastClick: GraphNodeClickCommand['nextLastClick'] = {
    nodeId: options.nodeId,
    time: options.now,
  };

  if (hasSelectionModifier(options.ctrlKey, options.shiftKey, options.metaKey)) {
    const nextSelection = toggleNodeSelection(options.nodeId, options.selectedNodeIds);
    effects.push({
      kind: 'setSelection',
      nodeIds: nextSelection,
    });
    if (nextSelection.length === 0) {
      effects.push({ kind: 'clearFocusedFile' });
    }
  } else if (isOnlySelectedNode(options.nodeId, options.selectedNodeIds)) {
    nextLastClick = null;
    effects.push({ kind: 'clearSelection' });
    effects.push({ kind: 'clearFocusedFile' });
  } else {
    effects.push({ kind: 'selectOnlyNode', nodeId: options.nodeId });
    effects.push({ kind: 'previewNode', nodeId: options.nodeId });
  }

  return { effects, nextLastClick };
}
