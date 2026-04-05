import type {
  GraphInteractionEffect,
  GraphNodeClickCommand,
} from './model';
import { toggleNodeSelection } from './nodeSelection';

export interface GraphNodeSingleClickOptions {
  clientX: number;
  clientY: number;
  ctrlKey: boolean;
  label: string;
  metaKey: boolean;
  nodeId: string;
  now: number;
  selectedNodeIds: Iterable<string>;
  shiftKey: boolean;
}

function hasSelectionModifier(
  ctrlKey: boolean,
  shiftKey: boolean,
  metaKey: boolean,
): boolean {
  return ctrlKey || shiftKey || metaKey;
}

function toPoint(x: number, y: number) {
  return { x, y };
}

function isOnlySelectedNode(
  nodeId: string,
  selectedNodeIds: Iterable<string>,
): boolean {
  const selection = [...selectedNodeIds];
  return selection.length === 1 && selection[0] === nodeId;
}

export function getNodeSingleClickCommand(
  options: GraphNodeSingleClickOptions,
): GraphNodeClickCommand {
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

  effects.push({
    kind: 'sendInteraction',
    event: 'graph:nodeClick',
    payload: {
      node: { id: options.nodeId, label: options.label },
      event: toPoint(options.clientX, options.clientY),
    },
  });

  return { nextLastClick, effects };
}
