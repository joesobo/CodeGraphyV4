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

export function getNodeSingleClickCommand(
  options: GraphNodeSingleClickOptions,
): GraphNodeClickCommand {
  const nextLastClick = { nodeId: options.nodeId, time: options.now };
  const effects: GraphInteractionEffect[] = [];

  if (hasSelectionModifier(options.ctrlKey, options.shiftKey, options.metaKey)) {
    effects.push({
      kind: 'setSelection',
      nodeIds: toggleNodeSelection(options.nodeId, options.selectedNodeIds),
    });
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
