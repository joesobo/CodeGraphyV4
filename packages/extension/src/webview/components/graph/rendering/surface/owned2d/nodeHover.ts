import { graphMotionDuration } from './motion';

export const OWNED_GRAPH_NODE_HOVER_SCALE = 1.1;
const OWNED_GRAPH_NODE_HOVER_DURATION_MS = 120;

interface OwnedGraphNodeHoverTransition {
  clearNodeOnComplete: boolean;
  durationMs: number;
  fromScale: number;
  startedAtMs: number;
  targetScale: number;
}

export interface OwnedGraphNodeHover {
  hovered: boolean;
  nodeId: string | null;
  scale: number;
  transition: OwnedGraphNodeHoverTransition | null;
}

export function createOwnedGraphNodeHover(): OwnedGraphNodeHover {
  return { hovered: false, nodeId: null, scale: 1, transition: null };
}

export function resetOwnedGraphNodeHover(hover: OwnedGraphNodeHover): void {
  hover.hovered = false;
  hover.nodeId = null;
  hover.scale = 1;
  hover.transition = null;
}

function smoothStep(progress: number): number {
  return progress * progress * (3 - 2 * progress);
}

export function advanceOwnedGraphNodeHover(
  hover: OwnedGraphNodeHover,
  timestampMs: number,
): boolean {
  const transition = hover.transition;
  if (!transition) return false;
  const elapsedMs = Math.max(0, timestampMs - transition.startedAtMs);
  const progress = Math.min(1, elapsedMs / transition.durationMs);
  const eased = smoothStep(progress);
  hover.scale = transition.fromScale
    + (transition.targetScale - transition.fromScale) * eased;
  if (progress < 1) return true;
  hover.scale = transition.targetScale;
  if (transition.clearNodeOnComplete) hover.nodeId = null;
  hover.transition = null;
  return false;
}

export function setOwnedGraphNodeHover(
  hover: OwnedGraphNodeHover,
  nodeId: string | null,
  timestampMs: number,
): void {
  advanceOwnedGraphNodeHover(hover, timestampMs);
  const durationMs = graphMotionDuration(OWNED_GRAPH_NODE_HOVER_DURATION_MS);
  if (nodeId !== null) {
    if (nodeId !== hover.nodeId) hover.scale = 1;
    hover.hovered = true;
    hover.nodeId = nodeId;
    if (durationMs === 0 || hover.scale === OWNED_GRAPH_NODE_HOVER_SCALE) {
      hover.scale = OWNED_GRAPH_NODE_HOVER_SCALE;
      hover.transition = null;
      return;
    }
    hover.transition = {
      clearNodeOnComplete: false,
      durationMs,
      fromScale: hover.scale,
      startedAtMs: timestampMs,
      targetScale: OWNED_GRAPH_NODE_HOVER_SCALE,
    };
    return;
  }
  if (hover.nodeId === null) return;
  hover.hovered = false;
  if (durationMs === 0 || hover.scale === 1) {
    resetOwnedGraphNodeHover(hover);
    return;
  }
  hover.transition = {
    clearNodeOnComplete: true,
    durationMs,
    fromScale: hover.scale,
    startedAtMs: timestampMs,
    targetScale: 1,
  };
}
