import { postMessage } from '../../vscodeApi';

export const GRAPH_SCOPE_VISIBILITY_MESSAGE_DEBOUNCE_MS = 80;

let pendingNodeVisibility: Record<string, boolean> = {};
let pendingEdgeVisibility: Record<string, boolean> = {};
let pendingPostedCallbacks: Array<() => void> = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function hasPendingVisibility(): boolean {
  return Object.keys(pendingNodeVisibility).length > 0
    || Object.keys(pendingEdgeVisibility).length > 0;
}

function scheduleFlush(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
  }

  flushTimer = setTimeout(() => {
    flushGraphScopeVisibilityMessages();
  }, GRAPH_SCOPE_VISIBILITY_MESSAGE_DEBOUNCE_MS);
}

function recordPostedCallback(onPosted?: () => void): void {
  if (onPosted) {
    pendingPostedCallbacks.push(onPosted);
  }
}

export function scheduleNodeVisibilityMessage(
  nodeType: string,
  visible: boolean,
  onPosted?: () => void,
): void {
  pendingNodeVisibility = {
    ...pendingNodeVisibility,
    [nodeType]: visible,
  };
  recordPostedCallback(onPosted);
  scheduleFlush();
}

export function scheduleEdgeVisibilityMessage(
  edgeKind: string,
  visible: boolean,
  onPosted?: () => void,
): void {
  pendingEdgeVisibility = {
    ...pendingEdgeVisibility,
    [edgeKind]: visible,
  };
  recordPostedCallback(onPosted);
  scheduleFlush();
}

export function flushGraphScopeVisibilityMessages(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (!hasPendingVisibility()) {
    return;
  }

  const nodeVisibility = pendingNodeVisibility;
  const edgeVisibility = pendingEdgeVisibility;
  const postedCallbacks = pendingPostedCallbacks;
  pendingNodeVisibility = {};
  pendingEdgeVisibility = {};
  pendingPostedCallbacks = [];

  postMessage({
    type: 'UPDATE_GRAPH_CONTROL_VISIBILITY_BATCH',
    payload: {
      ...(Object.keys(nodeVisibility).length > 0 ? { nodeVisibility } : {}),
      ...(Object.keys(edgeVisibility).length > 0 ? { edgeVisibility } : {}),
    },
  });
  for (const callback of postedCallbacks) {
    callback();
  }
}

export function resetGraphScopeVisibilityMessageQueueForTests(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  pendingNodeVisibility = {};
  pendingEdgeVisibility = {};
  pendingPostedCallbacks = [];
}
