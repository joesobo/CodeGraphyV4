import type { OwnedGraphCamera } from './camera';

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
