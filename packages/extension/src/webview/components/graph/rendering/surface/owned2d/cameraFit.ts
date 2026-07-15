import type { FGNode } from '../../../model/build';
import { clampOwnedGraphZoom, type OwnedGraphCamera } from './camera';
import { ownedGraphBounds } from './cameraBounds';

export function fitOwnedGraphCamera(
  camera: OwnedGraphCamera,
  nodes: readonly FGNode[],
  width: number,
  height: number,
  padding = 48,
): boolean {
  const bounds = ownedGraphBounds(nodes);
  if (!bounds || width <= 0 || height <= 0) return false;
  camera.transition = null;
  camera.centerX = (bounds.minimumX + bounds.maximumX) / 2;
  camera.centerY = (bounds.minimumY + bounds.maximumY) / 2;
  const availableWidth = Math.max(1, width - padding * 2);
  const availableHeight = Math.max(1, height - padding * 2);
  camera.zoom = clampOwnedGraphZoom(Math.min(
    availableWidth / Math.max(1, bounds.maximumX - bounds.minimumX),
    availableHeight / Math.max(1, bounds.maximumY - bounds.minimumY),
  ));
  return true;
}
