import { graphMotionDuration } from '../../simulation/motion';
import {
  advanceOwnedGraphNodeHover,
  type OwnedGraphNodeHover,
  resetOwnedGraphNodeHover,
} from './model';

const SCALE = 1.1;
const DURATION_MS = 120;

export function setOwnedGraphNodeHover(hover: OwnedGraphNodeHover, nodeId: string | null, timestampMs: number): void {
  advanceOwnedGraphNodeHover(hover, timestampMs);
  const durationMs = graphMotionDuration(DURATION_MS);
  if (nodeId !== null) {
    if (nodeId !== hover.nodeId) hover.scale = 1;
    hover.nodeId = nodeId;
    if (durationMs === 0 || hover.scale === SCALE) {
      hover.scale = SCALE;
      hover.transition = null;
      return;
    }
    hover.transition = { fromScale: hover.scale, startedAtMs: timestampMs, targetScale: SCALE };
    return;
  }
  if (hover.nodeId === null) return;
  if (durationMs === 0 || hover.scale === 1) {
    resetOwnedGraphNodeHover(hover);
    return;
  }
  hover.transition = { fromScale: hover.scale, startedAtMs: timestampMs, targetScale: 1 };
}
