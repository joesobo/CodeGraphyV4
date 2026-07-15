import type { OwnedGraphCamera } from './camera';
import { applyCameraPose } from './cameraPose';

export function advanceOwnedGraphCameraTransition(camera: OwnedGraphCamera, timestampMs: number): boolean {
  const transition = camera.transition;
  if (!transition) return false;
  const progress = Math.min(1, Math.max(0, timestampMs - transition.startedAtMs) / transition.durationMs);
  if (progress >= 1) {
    applyCameraPose(camera, transition.target);
    camera.transition = null;
    return false;
  }
  const eased = 1 - (1 - progress) ** 3;
  camera.centerX = transition.from.centerX + (transition.target.centerX - transition.from.centerX) * eased;
  camera.centerY = transition.from.centerY + (transition.target.centerY - transition.from.centerY) * eased;
  camera.zoom = Math.exp(Math.log(transition.from.zoom)
    + (Math.log(transition.target.zoom) - Math.log(transition.from.zoom)) * eased);
  return true;
}
