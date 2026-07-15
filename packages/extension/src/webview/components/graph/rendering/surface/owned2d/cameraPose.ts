import { clampOwnedGraphZoom, type OwnedGraphCamera, type OwnedGraphCameraPose } from './camera';

export function cameraPose(camera: OwnedGraphCameraPose): OwnedGraphCameraPose {
  return { centerX: camera.centerX, centerY: camera.centerY, zoom: camera.zoom };
}

export function applyCameraPose(camera: OwnedGraphCamera, pose: OwnedGraphCameraPose): void {
  camera.centerX = pose.centerX;
  camera.centerY = pose.centerY;
  camera.zoom = pose.zoom;
}

export function cameraDestination(camera: OwnedGraphCamera, target: Partial<OwnedGraphCameraPose>, animated: boolean): OwnedGraphCameraPose {
  const next = { ...(animated ? camera.transition?.target : undefined) ?? cameraPose(camera), ...target };
  next.zoom = clampOwnedGraphZoom(next.zoom);
  return next;
}
