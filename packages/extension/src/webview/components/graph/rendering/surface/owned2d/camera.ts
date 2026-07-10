import type { FGNode } from '../../../model/build';

const MINIMUM_ZOOM = 0.02;
const MAXIMUM_ZOOM = 12;

export interface OwnedGraphCamera {
  centerX: number;
  centerY: number;
  zoom: number;
}

export function clampOwnedGraphZoom(zoom: number): number {
  return Math.min(MAXIMUM_ZOOM, Math.max(MINIMUM_ZOOM, zoom));
}

export function graphToScreen(
  camera: OwnedGraphCamera,
  width: number,
  height: number,
  x: number,
  y: number,
): { x: number; y: number } {
  return {
    x: (x - camera.centerX) * camera.zoom + width / 2,
    y: (y - camera.centerY) * camera.zoom + height / 2,
  };
}

export function screenToGraph(
  camera: OwnedGraphCamera,
  width: number,
  height: number,
  x: number,
  y: number,
): { x: number; y: number } {
  return {
    x: camera.centerX + (x - width / 2) / camera.zoom,
    y: camera.centerY + (y - height / 2) / camera.zoom,
  };
}

export function fitOwnedGraphCamera(
  camera: OwnedGraphCamera,
  nodes: readonly FGNode[],
  width: number,
  height: number,
  padding = 48,
): void {
  const positioned = nodes.filter((node) => Number.isFinite(node.x) && Number.isFinite(node.y));
  if (positioned.length === 0 || width <= 0 || height <= 0) return;

  let minimumX = Number.POSITIVE_INFINITY;
  let minimumY = Number.POSITIVE_INFINITY;
  let maximumX = Number.NEGATIVE_INFINITY;
  let maximumY = Number.NEGATIVE_INFINITY;
  for (const node of positioned) {
    const radius = Math.max(1, node.size ?? 4);
    minimumX = Math.min(minimumX, (node.x as number) - radius);
    minimumY = Math.min(minimumY, (node.y as number) - radius);
    maximumX = Math.max(maximumX, (node.x as number) + radius);
    maximumY = Math.max(maximumY, (node.y as number) + radius);
  }

  camera.centerX = (minimumX + maximumX) / 2;
  camera.centerY = (minimumY + maximumY) / 2;
  const availableWidth = Math.max(1, width - padding * 2);
  const availableHeight = Math.max(1, height - padding * 2);
  camera.zoom = clampOwnedGraphZoom(Math.min(
    availableWidth / Math.max(1, maximumX - minimumX),
    availableHeight / Math.max(1, maximumY - minimumY),
  ));
}
