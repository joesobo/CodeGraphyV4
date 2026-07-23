import type {
  GraphLastClickState,
  GraphNodeClickCommand,
} from '../model';

export interface GraphNodeDoubleClickOptions {
  clientX: number;
  clientY: number;
  doubleClickThresholdMs: number;
  isRuntimeNode?: boolean;
  label: string;
  lastClick: GraphLastClickState | null;
  nodeId: string;
  now: number;
}

function getRuntimeNodeDoubleClickEffects(
  options: GraphNodeDoubleClickOptions,
): GraphNodeClickCommand['effects'] {
  return [
    { kind: 'selectOnlyNode', nodeId: options.nodeId },
  ];
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
  if (options.isRuntimeNode) {
    return {
      nextLastClick: null,
      effects: getRuntimeNodeDoubleClickEffects(options),
    };
  }

  return {
    nextLastClick: null,
    effects: [
      { kind: 'selectOnlyNode', nodeId: options.nodeId },
      { kind: 'openNode', nodeId: options.nodeId },
      { kind: 'focusNode', nodeId: options.nodeId },
    ],
  };
}
