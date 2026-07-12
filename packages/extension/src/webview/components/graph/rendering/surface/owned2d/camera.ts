import type { FGNode } from '../../../model/build';

export const MINIMUM_OWNED_GRAPH_ZOOM = 0.005;
export const MAXIMUM_OWNED_GRAPH_ZOOM = 64;

export interface OwnedGraphCamera {
  centerX: number;
  centerY: number;
  zoom: number;
}

export function clampOwnedGraphZoom(zoom: number): number {
  return Math.min(MAXIMUM_OWNED_GRAPH_ZOOM, Math.max(MINIMUM_OWNED_GRAPH_ZOOM, zoom));
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
): boolean {
  const positioned = nodes.filter((node) => Number.isFinite(node.x) && Number.isFinite(node.y));
  if (positioned.length === 0 || width <= 0 || height <= 0) return false;

  let minimumX = Number.POSITIVE_INFINITY;
  let minimumY = Number.POSITIVE_INFINITY;
  let maximumX = Number.NEGATIVE_INFINITY;
  let maximumY = Number.NEGATIVE_INFINITY;
  for (const node of positioned) {
    const halfWidth = Math.max(1, node.shapeSize2D?.width ? node.shapeSize2D.width / 2 : node.size ?? 4);
    const halfHeight = Math.max(1, node.shapeSize2D?.height ? node.shapeSize2D.height / 2 : node.size ?? 4);
    minimumX = Math.min(minimumX, (node.x as number) - halfWidth);
    minimumY = Math.min(minimumY, (node.y as number) - halfHeight);
    maximumX = Math.max(maximumX, (node.x as number) + halfWidth);
    maximumY = Math.max(maximumY, (node.y as number) + halfHeight);
  }

  camera.centerX = (minimumX + maximumX) / 2;
  camera.centerY = (minimumY + maximumY) / 2;
  const availableWidth = Math.max(1, width - padding * 2);
  const availableHeight = Math.max(1, height - padding * 2);
  camera.zoom = clampOwnedGraphZoom(Math.min(
    availableWidth / Math.max(1, maximumX - minimumX),
    availableHeight / Math.max(1, maximumY - minimumY),
  ));
  return true;
}
