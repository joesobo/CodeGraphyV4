import type { FGNode } from '../../../model/build';

export const MINIMUM_OWNED_GRAPH_ZOOM = 0.005;
export const MAXIMUM_OWNED_GRAPH_ZOOM = 64;

export interface OwnedGraphCameraPose {
  centerX: number;
  centerY: number;
  zoom: number;
}

export interface OwnedGraphCameraTransition {
  durationMs: number;
  from: OwnedGraphCameraPose;
  startedAtMs: number;
  target: OwnedGraphCameraPose;
}

export interface OwnedGraphCamera extends OwnedGraphCameraPose {
  transition?: OwnedGraphCameraTransition | null;
}

export function clampOwnedGraphZoom(zoom: number): number {
  return Math.min(MAXIMUM_OWNED_GRAPH_ZOOM, Math.max(MINIMUM_OWNED_GRAPH_ZOOM, zoom));
}

function cameraPose(camera: OwnedGraphCameraPose): OwnedGraphCameraPose {
  return {
    centerX: camera.centerX,
    centerY: camera.centerY,
    zoom: camera.zoom,
  };
}

function applyCameraPose(
  camera: OwnedGraphCamera,
  pose: OwnedGraphCameraPose,
): void {
  camera.centerX = pose.centerX;
  camera.centerY = pose.centerY;
  camera.zoom = pose.zoom;
}

function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

export function advanceOwnedGraphCameraTransition(
  camera: OwnedGraphCamera,
  timestampMs: number,
): boolean {
  const transition = camera.transition;
  if (!transition) return false;
  const elapsedMs = Math.max(0, timestampMs - transition.startedAtMs);
  const progress = Math.min(1, elapsedMs / transition.durationMs);
  if (progress >= 1) {
    applyCameraPose(camera, transition.target);
    camera.transition = null;
    return false;
  }
  const eased = easeOutCubic(progress);
  camera.centerX = transition.from.centerX
    + (transition.target.centerX - transition.from.centerX) * eased;
  camera.centerY = transition.from.centerY
    + (transition.target.centerY - transition.from.centerY) * eased;
  camera.zoom = Math.exp(
    Math.log(transition.from.zoom)
    + (Math.log(transition.target.zoom) - Math.log(transition.from.zoom)) * eased,
  );
  return true;
}

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
  advanceOwnedGraphCameraTransition(camera, timestampMs);
  const duration = Number.isFinite(durationMs) ? Math.max(0, durationMs ?? 0) : 0;
  if (duration === 0) {
    applyCameraPose(camera, {
      ...cameraPose(camera),
      ...target,
      zoom: clampOwnedGraphZoom(target.zoom ?? camera.zoom),
    });
    camera.transition = null;
    return;
  }
  const destination = {
    ...(camera.transition?.target ?? cameraPose(camera)),
    ...target,
  };
  destination.zoom = clampOwnedGraphZoom(destination.zoom);
  if (destination.centerX === camera.centerX
    && destination.centerY === camera.centerY
    && destination.zoom === camera.zoom) {
    camera.transition = null;
    return;
  }
  camera.transition = {
    durationMs: duration,
    from: cameraPose(camera),
    startedAtMs: timestampMs,
    target: destination,
  };
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

  camera.transition = null;
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
