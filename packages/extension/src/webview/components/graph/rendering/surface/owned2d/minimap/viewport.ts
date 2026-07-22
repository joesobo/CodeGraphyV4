import type { OwnedGraphCamera } from '../camera/runtime/model';
import { minimapPointFromGraph, type MinimapProjection } from './projection';

export interface MinimapViewportBox {
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface MinimapDirectionIndicator {
  angle: number;
  x: number;
  y: number;
}

export interface MinimapViewport {
  box: MinimapViewportBox | null;
  indicator: MinimapDirectionIndicator | null;
}

interface MinimapViewportInput {
  camera: OwnedGraphCamera;
  viewportHeight: number;
  viewportWidth: number;
}

export function projectMinimapViewport(
  projection: MinimapProjection,
  input: MinimapViewportInput,
): MinimapViewport {
  const graphWidth = input.viewportWidth / input.camera.zoom;
  const graphHeight = input.viewportHeight / input.camera.zoom;
  const center = minimapPointFromGraph(projection, {
    x: input.camera.centerX,
    y: input.camera.centerY,
  });
  const width = graphWidth * projection.zoom;
  const height = graphHeight * projection.zoom;
  const rawLeft = center.x - width / 2;
  const rawTop = center.y - height / 2;
  const left = Math.max(0, rawLeft);
  const top = Math.max(0, rawTop);
  const right = Math.min(projection.size, rawLeft + width);
  const bottom = Math.min(projection.size, rawTop + height);
  if (right > left && bottom > top) {
    return {
      box: { height: bottom - top, width: right - left, x: left, y: top },
      indicator: null,
    };
  }

  const panelCenter = projection.size / 2;
  const deltaX = center.x - panelCenter;
  const deltaY = center.y - panelCenter;
  const available = panelCenter - projection.padding;
  const scale = Math.min(
    deltaX === 0 ? Number.POSITIVE_INFINITY : available / Math.abs(deltaX),
    deltaY === 0 ? Number.POSITIVE_INFINITY : available / Math.abs(deltaY),
  );
  return {
    box: null,
    indicator: {
      angle: Math.atan2(deltaY, deltaX),
      x: panelCenter + deltaX * scale,
      y: panelCenter + deltaY * scale,
    },
  };
}
