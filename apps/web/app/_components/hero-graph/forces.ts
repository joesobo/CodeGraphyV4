import type {
  GraphLayoutEngine,
  GraphLayoutExternalForce,
} from '@codegraphy-dev/graph-renderer';
import type { CanvasSize, PointerPosition } from './types';

export function updatePointerPosition(pointer: PointerPosition): void {
  const smoothing = pointer.active ? 0.14 : 0.06;
  pointer.currentX += (pointer.targetX - pointer.currentX) * smoothing;
  pointer.currentY += (pointer.targetY - pointer.currentY) * smoothing;
}

export function createHeroForces(
  layout: GraphLayoutEngine,
  orbitSpeedMultipliers: Float32Array,
  getCanvasSize: () => CanvasSize,
): GraphLayoutExternalForce {
  let ambientPhase = 0;

  return {
    beforeIntegration: alpha => {
      ambientPhase += 0.006;
      let centerX = 0;
      let centerY = 0;

      for (let index = 0; index < layout.nodeIds.length; index += 1) {
        centerX += layout.x[index];
        centerY += layout.y[index];
      }

      centerX /= layout.nodeIds.length;
      centerY /= layout.nodeIds.length;

      const settleProgress = 1 - Math.min(1, Math.max(0, alpha - 0.014) / 0.3);
      const anchorAcceleration = 0.0016 * (0.4 + settleProgress * 0.6);
      const clusterGravity = 0.0002 * (0.35 + settleProgress * 0.65);
      const orbitAcceleration = 0.000095 * (0.2 + settleProgress * 0.8);
      const driftAcceleration = 0.012 * (0.25 + settleProgress * 0.75);

      for (let index = 0; index < layout.nodeIds.length; index += 1) {
        layout.vx[index] -= centerX * anchorAcceleration;
        layout.vy[index] -= centerY * anchorAcceleration;

        const clusterOffsetX = layout.x[index] - centerX;
        const clusterOffsetY = layout.y[index] - centerY;
        layout.vx[index] -= clusterOffsetX * clusterGravity * 0.42;
        layout.vy[index] -= clusterOffsetY * clusterGravity;

        const orbitSpeed = orbitAcceleration * orbitSpeedMultipliers[index];
        layout.vx[index] -= clusterOffsetY * orbitSpeed;
        layout.vy[index] += clusterOffsetX * orbitSpeed;

        const driftPhase = ambientPhase * (0.75 + Math.abs(orbitSpeedMultipliers[index]) * 0.3)
          + index * 2.399;
        layout.vx[index] += Math.cos(driftPhase) * driftAcceleration;
        layout.vy[index] += Math.sin(driftPhase * 0.86) * driftAcceleration;
      }
    },
    afterIntegration: () => ({
      positionChanged: containGraphWithinCanvas(layout, getCanvasSize()),
    }),
  };
}

export function containGraphWithinCanvas(
  layout: GraphLayoutEngine,
  size: CanvasSize,
): boolean {
  const scale = graphScale(size);
  const halfWidth = size.width / (scale * 2);
  const halfHeight = size.height / (scale * 2);
  let positionChanged = false;

  for (let index = 0; index < layout.nodeIds.length; index += 1) {
    const renderedRadius = (
      Math.max(4.5, layout.radii[index] * 0.78) * 1.22 + 2
    ) / scale;
    const boundedHalfWidth = Math.max(renderedRadius, halfWidth);
    const boundedHalfHeight = Math.max(renderedRadius, halfHeight);
    const minX = -boundedHalfWidth + renderedRadius;
    const maxX = boundedHalfWidth - renderedRadius;
    const minY = -boundedHalfHeight + renderedRadius;
    const maxY = boundedHalfHeight - renderedRadius;

    if (layout.x[index] < minX) {
      layout.x[index] = minX;
      layout.vx[index] = Math.abs(layout.vx[index]) * 0.58;
      positionChanged = true;
    } else if (layout.x[index] > maxX) {
      layout.x[index] = maxX;
      layout.vx[index] = -Math.abs(layout.vx[index]) * 0.58;
      positionChanged = true;
    }

    if (layout.y[index] < minY) {
      layout.y[index] = minY;
      layout.vy[index] = Math.abs(layout.vy[index]) * 0.58;
      positionChanged = true;
    } else if (layout.y[index] > maxY) {
      layout.y[index] = maxY;
      layout.vy[index] = -Math.abs(layout.vy[index]) * 0.58;
      positionChanged = true;
    }
  }

  return positionChanged;
}

export function graphScale(size: CanvasSize): number {
  return Math.max(0.78, Math.min(size.width / 720, size.height / 540));
}
