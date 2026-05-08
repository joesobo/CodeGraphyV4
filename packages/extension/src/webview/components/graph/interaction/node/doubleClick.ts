import type {
  GraphLastClickState,
  GraphNodeClickCommand,
} from '../model';

export interface GraphNodeDoubleClickOptions {
  clientX: number;
  clientY: number;
  doubleClickThresholdMs: number;
  isCollapsedGraphSection?: boolean;
  isGraphSection?: boolean;
  label: string;
  lastClick: GraphLastClickState | null;
  nodeId: string;
  now: number;
}

function toPoint(x: number, y: number) {
  return { x, y };
}

function createNodeDoubleClickInteractionEffect(
  options: GraphNodeDoubleClickOptions,
): GraphNodeClickCommand['effects'][number] {
  return {
    kind: 'sendInteraction',
    event: 'graph:nodeDoubleClick',
    payload: {
      node: { id: options.nodeId, label: options.label },
      event: toPoint(options.clientX, options.clientY),
    },
  };
}

function getGraphSectionDoubleClickEffects(
  options: GraphNodeDoubleClickOptions,
): GraphNodeClickCommand['effects'] {
  return [
    { kind: 'selectOnlyNode', nodeId: options.nodeId },
    createNodeDoubleClickInteractionEffect(options),
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
  if (options.isGraphSection) {
    return {
      nextLastClick: null,
      effects: getGraphSectionDoubleClickEffects(options),
    };
  }

  return {
    nextLastClick: null,
    effects: [
      { kind: 'selectOnlyNode', nodeId: options.nodeId },
      { kind: 'openNode', nodeId: options.nodeId },
      { kind: 'focusNode', nodeId: options.nodeId },
      createNodeDoubleClickInteractionEffect(options),
    ],
  };
}
