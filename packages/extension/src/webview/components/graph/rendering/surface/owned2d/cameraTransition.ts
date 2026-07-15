import type { OwnedGraphCamera, OwnedGraphCameraPose } from './camera';
import { applyCameraPose, cameraDestination, cameraPose } from './cameraPose';
import { advanceOwnedGraphCameraTransition } from './cameraAdvance';
export { advanceOwnedGraphCameraTransition } from './cameraAdvance';

export function cancelOwnedGraphCameraTransition(camera: OwnedGraphCamera): void {
  camera.transition = null;
}

export function readOwnedGraphCameraTargetZoom(camera: OwnedGraphCamera): number {
  return camera.transition?.target.zoom ?? camera.zoom;
}

export function transitionOwnedGraphCamera(
  camera: OwnedGraphCamera,
  target: Partial<OwnedGraphCameraPose>,
  durationMs: number | undefined,
  timestampMs: number,
): void {
  const duration = Number.isFinite(durationMs) ? Math.max(0, durationMs ?? 0) : 0;
  if (duration === 0) {
    applyCameraPose(camera, cameraDestination(camera, target, false));
    camera.transition = null;
    return;
  }
  advanceOwnedGraphCameraTransition(camera, timestampMs);
  const targetPose = cameraDestination(camera, target, true);
  if (targetPose.centerX === camera.centerX && targetPose.centerY === camera.centerY && targetPose.zoom === camera.zoom) {
    camera.transition = null;
    return;
  }
  camera.transition = { durationMs: duration, from: cameraPose(camera), startedAtMs: timestampMs, target: targetPose };
}
