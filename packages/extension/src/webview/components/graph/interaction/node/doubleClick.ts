import type {
  GraphLastClickState,
  GraphNodeClickCommand,
} from '../model';

export interface GraphNodeDoubleClickOptions {
  clientX: number;
  clientY: number;
  doubleClickThresholdMs: number;
  label: string;
  lastClick: GraphLastClickState | null;
  nodeId: string;
  now: number;
}

function toPoint(x: number, y: number) {
  return { x, y };
}

export function isDoubleNodeClick(
  options: GraphNodeDoubleClickOptions,
): boolean {
  return Boolean(
    options.lastClick
      && options.lastClick.nodeId === options.nodeId
      && options.now - options.lastClick.time < options.doubleClickThresholdMs,
  );
}

export function getNodeDoubleClickCommand(
  options: GraphNodeDoubleClickOptions,
): GraphNodeClickCommand {
  return {
    nextLastClick: null,
    effects: [
      { kind: 'selectOnlyNode', nodeId: options.nodeId },
      { kind: 'openNode', nodeId: options.nodeId },
      { kind: 'focusNode', nodeId: options.nodeId },
      {
        kind: 'sendInteraction',
        event: 'graph:nodeDoubleClick',
        payload: {
          node: { id: options.nodeId, label: options.label },
          event: toPoint(options.clientX, options.clientY),
        },
      },
    ],
  };
}
