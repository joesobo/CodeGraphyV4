import { graphMotionDuration } from './motion';

const NODE_HOVER_SCALE = 1.1;
const NODE_HOVER_DURATION_MS = 120;

interface OwnedGraphNodeHoverTransition {
  fromScale: number;
  startedAtMs: number;
  targetScale: number;
}

export interface OwnedGraphNodeHover {
  nodeId: string | null;
  scale: number;
  transition: OwnedGraphNodeHoverTransition | null;
}

export function createOwnedGraphNodeHover(): OwnedGraphNodeHover {
  return { nodeId: null, scale: 1, transition: null };
}

export function resetOwnedGraphNodeHover(hover: OwnedGraphNodeHover): void {
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
): void {
  const transition = hover.transition;
  if (!transition) return;
  const elapsedMs = Math.max(0, timestampMs - transition.startedAtMs);
  const progress = Math.min(1, elapsedMs / NODE_HOVER_DURATION_MS);
  const eased = smoothStep(progress);
  hover.scale = transition.fromScale
    + (transition.targetScale - transition.fromScale) * eased;
  if (progress < 1) return;
  hover.scale = transition.targetScale;
  if (transition.targetScale === 1) hover.nodeId = null;
  hover.transition = null;
}

export function setOwnedGraphNodeHover(
  hover: OwnedGraphNodeHover,
  nodeId: string | null,
  timestampMs: number,
): void {
  advanceOwnedGraphNodeHover(hover, timestampMs);
  const durationMs = graphMotionDuration(NODE_HOVER_DURATION_MS);
  if (nodeId !== null) {
    if (nodeId !== hover.nodeId) hover.scale = 1;
    hover.nodeId = nodeId;
    if (durationMs === 0 || hover.scale === NODE_HOVER_SCALE) {
      hover.scale = NODE_HOVER_SCALE;
      hover.transition = null;
      return;
    }
    hover.transition = {
      fromScale: hover.scale,
      startedAtMs: timestampMs,
      targetScale: NODE_HOVER_SCALE,
    };
    return;
  }
  if (hover.nodeId === null) return;
  if (durationMs === 0 || hover.scale === 1) {
    resetOwnedGraphNodeHover(hover);
    return;
  }
  hover.transition = {
    fromScale: hover.scale,
    startedAtMs: timestampMs,
    targetScale: 1,
  };
}
