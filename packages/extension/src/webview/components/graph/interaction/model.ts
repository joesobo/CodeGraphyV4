export interface GraphLastClickState {
  nodeId: string;
  time: number;
}

export type GraphInteractionEffect =
  | { kind: 'openNodeContextMenu'; nodeId: string }
  | { kind: 'openBackgroundContextMenu' }
  | { kind: 'openEdgeContextMenu' }
  | { kind: 'selectOnlyNode'; nodeId: string }
  | { kind: 'setSelection'; nodeIds: string[] }
  | { kind: 'clearSelection' }
  | { kind: 'clearFocusedFile' }
  | { kind: 'previewNode'; nodeId: string }
  | { kind: 'openNode'; nodeId: string }
  | { kind: 'focusNode'; nodeId: string };

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
  isRuntimeNode?: boolean;
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

export { getNodeContextMenuSelection } from './node/selection';
export { getNodeClickCommand } from './node/click';
export {
  getBackgroundClickCommand,
  getLinkClickCommand,
} from './surfaceClick';
export {
  shouldMarkRightMouseDrag,
  shouldUseRightClickFallback,
} from './pointer';
