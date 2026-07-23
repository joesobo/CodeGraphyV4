import {
  GraphNodeFlag,
  type GraphLayoutEngine,
  type GraphLayoutExternalForce,
} from '@codegraphy-dev/graph-renderer';
import { toPhysicsCoordinate } from '../scale/model';
import { shapePageBounds, type ShapeGeometryHost } from '../shape/geometry';
import {
  isFrameShape,
  isNodeShape,
  type ScriptShape,
} from '../shape/model';

const FRAME_GRAVITY_BASE_STRENGTH = 0.5;

interface FramePull {
  index: number;
  maximumX: number;
  maximumY: number;
  minimumX: number;
  minimumY: number;
  x: number;
  y: number;
}

export function createFrameGravityForce(
  shapes: readonly ScriptShape[],
  engine: GraphLayoutEngine,
  centralGravity: number,
  geometryHost?: ShapeGeometryHost,
): GraphLayoutExternalForce | undefined {
  const frames = new Map(
    shapes.filter(isFrameShape).map(frame => [frame.id, frame]),
  );
  const pulls: FramePull[] = [];
  for (const node of shapes.filter(isNodeShape)) {
    const frame = node.parentId === undefined ? undefined : frames.get(node.parentId);
    const index = engine.getNodeIndex(node.meta.codegraphyEntityId);
    if (!frame || index === undefined || index < 0) continue;
    const bounds = shapePageBounds(frame, geometryHost);
    const radius = engine.radii[index];
    const centerX = toPhysicsCoordinate(bounds.x + bounds.w / 2);
    const centerY = toPhysicsCoordinate(bounds.y + bounds.h / 2);
    pulls.push({
      index,
      maximumX: Math.max(centerX, toPhysicsCoordinate(bounds.x + bounds.w) - radius),
      maximumY: Math.max(centerY, toPhysicsCoordinate(bounds.y + bounds.h) - radius),
      minimumX: Math.min(centerX, toPhysicsCoordinate(bounds.x) + radius),
      minimumY: Math.min(centerY, toPhysicsCoordinate(bounds.y) + radius),
      x: centerX,
      y: centerY,
    });
  }
  if (pulls.length === 0) return undefined;

  return {
    beforeIntegration: alpha => {
      for (const pull of pulls) {
        if ((engine.flags[pull.index] & GraphNodeFlag.Pinned) !== 0) continue;
        if (engine.x[pull.index] < pull.minimumX) {
          engine.x[pull.index] = pull.minimumX;
          engine.vx[pull.index] = Math.max(0, engine.vx[pull.index]);
        } else if (engine.x[pull.index] > pull.maximumX) {
          engine.x[pull.index] = pull.maximumX;
          engine.vx[pull.index] = Math.min(0, engine.vx[pull.index]);
        }
        if (engine.y[pull.index] < pull.minimumY) {
          engine.y[pull.index] = pull.minimumY;
          engine.vy[pull.index] = Math.max(0, engine.vy[pull.index]);
        } else if (engine.y[pull.index] > pull.maximumY) {
          engine.y[pull.index] = pull.maximumY;
          engine.vy[pull.index] = Math.min(0, engine.vy[pull.index]);
        }
        engine.vx[pull.index] += engine.x[pull.index] * centralGravity * alpha;
        engine.vy[pull.index] += engine.y[pull.index] * centralGravity * alpha;
        engine.vx[pull.index] += (
          pull.x - engine.x[pull.index]
        ) * (FRAME_GRAVITY_BASE_STRENGTH + centralGravity) * alpha;
        engine.vy[pull.index] += (
          pull.y - engine.y[pull.index]
        ) * (FRAME_GRAVITY_BASE_STRENGTH + centralGravity) * alpha;
      }
    },
  };
}
