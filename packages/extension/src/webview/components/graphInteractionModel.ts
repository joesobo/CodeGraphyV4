export interface GraphLastClickState {
  nodeId: string;
  time: number;
}

export interface GraphInteractionPoint {
  x: number;
  y: number;
}

export type GraphInteractionEffect =
  | { kind: 'openNodeContextMenu'; nodeId: string }
  | { kind: 'openBackgroundContextMenu' }
  | { kind: 'openEdgeContextMenu' }
  | { kind: 'selectOnlyNode'; nodeId: string }
  | { kind: 'setSelection'; nodeIds: string[] }
  | { kind: 'clearSelection' }
  | { kind: 'previewNode'; nodeId: string }
  | { kind: 'openNode'; nodeId: string }
  | { kind: 'focusNode'; nodeId: string }
  | {
      kind: 'sendInteraction';
      event: 'graph:nodeClick' | 'graph:nodeDoubleClick' | 'graph:backgroundClick';
      payload: unknown;
    };

export interface GraphNodeContextMenuSelection {
  nodeIds: string[];
  shouldUpdateSelection: boolean;
}

export interface GraphNodeClickOptions {
  nodeId: string;
  label: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
  clientX: number;
  clientY: number;
  isMacPlatform: boolean;
  selectedNodeIds: Iterable<string>;
  lastClick: GraphLastClickState | null;
  now: number;
  doubleClickThresholdMs: number;
}

export interface GraphNodeClickCommand {
  nextLastClick: GraphLastClickState | null;
  effects: GraphInteractionEffect[];
}

export interface GraphModifierClickOptions {
  ctrlKey: boolean;
  isMacPlatform: boolean;
}

export interface GraphRightMouseDragOptions {
  startX: number;
  startY: number;
  nextX: number;
  nextY: number;
  thresholdPx: number;
}

export interface GraphRightClickFallbackOptions {
  now: number;
  lastGraphContextEvent: number;
  lastContainerContextMenuEvent: number;
  fallbackDelayMs: number;
}

function isMacControlContextAction(ctrlKey: boolean, isMacPlatform: boolean): boolean {
  return isMacPlatform && ctrlKey;
}

function toPoint(x: number, y: number): GraphInteractionPoint {
  return { x, y };
}

function toggleSelection(nodeId: string, selectedNodeIds: Iterable<string>): string[] {
  const nextSelection = new Set(selectedNodeIds);
  if (nextSelection.has(nodeId)) {
    nextSelection.delete(nodeId);
  } else {
    nextSelection.add(nodeId);
  }
  return [...nextSelection];
}

export function getNodeContextMenuSelection(
  nodeId: string,
  selectedNodeIds: Iterable<string>
): GraphNodeContextMenuSelection {
  const currentSelection = new Set(selectedNodeIds);
  if (currentSelection.has(nodeId)) {
    return {
      nodeIds: [...currentSelection],
      shouldUpdateSelection: false,
    };
  }

  return {
    nodeIds: [nodeId],
    shouldUpdateSelection: true,
  };
}

export function getNodeClickCommand(options: GraphNodeClickOptions): GraphNodeClickCommand {
  const {
    nodeId,
    label,
    ctrlKey,
    shiftKey,
    metaKey,
    clientX,
    clientY,
    isMacPlatform,
    selectedNodeIds,
    lastClick,
    now,
    doubleClickThresholdMs,
  } = options;
  const eventPoint = toPoint(clientX, clientY);

  if (isMacControlContextAction(ctrlKey, isMacPlatform)) {
    return {
      nextLastClick: lastClick,
      effects: [{ kind: 'openNodeContextMenu', nodeId }],
    };
  }

  if (lastClick && lastClick.nodeId === nodeId && now - lastClick.time < doubleClickThresholdMs) {
    return {
      nextLastClick: null,
      effects: [
        { kind: 'selectOnlyNode', nodeId },
        { kind: 'openNode', nodeId },
        { kind: 'focusNode', nodeId },
        {
          kind: 'sendInteraction',
          event: 'graph:nodeDoubleClick',
          payload: {
            node: { id: nodeId, label },
            event: eventPoint,
          },
        },
      ],
    };
  }

  const nextLastClick = { nodeId, time: now };
  const effects: GraphInteractionEffect[] = [];
  if (ctrlKey || shiftKey || metaKey) {
    effects.push({
      kind: 'setSelection',
      nodeIds: toggleSelection(nodeId, selectedNodeIds),
    });
  } else {
    effects.push({ kind: 'selectOnlyNode', nodeId });
    effects.push({ kind: 'previewNode', nodeId });
  }

  effects.push({
    kind: 'sendInteraction',
    event: 'graph:nodeClick',
    payload: {
      node: { id: nodeId, label },
      event: eventPoint,
    },
  });

  return { nextLastClick, effects };
}

export function getBackgroundClickCommand(options: GraphModifierClickOptions): GraphInteractionEffect[] {
  if (isMacControlContextAction(options.ctrlKey, options.isMacPlatform)) {
    return [{ kind: 'openBackgroundContextMenu' }];
  }

  return [
    { kind: 'clearSelection' },
    { kind: 'sendInteraction', event: 'graph:backgroundClick', payload: {} },
  ];
}

export function getLinkClickCommand(options: GraphModifierClickOptions): GraphInteractionEffect[] {
  return isMacControlContextAction(options.ctrlKey, options.isMacPlatform)
    ? [{ kind: 'openEdgeContextMenu' }]
    : [];
}

export function shouldMarkRightMouseDrag(options: GraphRightMouseDragOptions): boolean {
  const dx = options.nextX - options.startX;
  const dy = options.nextY - options.startY;
  return (dx * dx) + (dy * dy) > (options.thresholdPx * options.thresholdPx);
}

export function shouldUseRightClickFallback(options: GraphRightClickFallbackOptions): boolean {
  const recentWindow = options.fallbackDelayMs * 3;
  const graphCallbackHandledRecently = options.now - options.lastGraphContextEvent <= recentWindow;
  const contextMenuHandledRecently = options.now - options.lastContainerContextMenuEvent <= recentWindow;
  return !graphCallbackHandledRecently && !contextMenuHandledRecently;
}
