import type { FGNode } from '../../../model/build';

export const MINIMUM_OWNED_GRAPH_ZOOM = 0.005;
export const MAXIMUM_OWNED_GRAPH_ZOOM = 64;

export interface OwnedGraphCameraPose {
  centerX: number;
  centerY: number;
  zoom: number;
}

interface OwnedGraphCameraTransition {
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

function transitionDuration(durationMs: number | undefined): number {
  return Number.isFinite(durationMs) ? Math.max(0, durationMs ?? 0) : 0;
}

function immediateCameraDestination(
  camera: OwnedGraphCamera,
  target: Partial<OwnedGraphCameraPose>,
): OwnedGraphCameraPose {
  return {
    ...cameraPose(camera),
    ...target,
    zoom: clampOwnedGraphZoom(target.zoom ?? camera.zoom),
  };
}

function animatedCameraDestination(
  camera: OwnedGraphCamera,
  target: Partial<OwnedGraphCameraPose>,
): OwnedGraphCameraPose {
  const destination = {
    ...(camera.transition?.target ?? cameraPose(camera)),
    ...target,
  };
  destination.zoom = clampOwnedGraphZoom(destination.zoom);
  return destination;
}

function sameCameraPose(first: OwnedGraphCameraPose, second: OwnedGraphCameraPose): boolean {
  return first.centerX === second.centerX
    && first.centerY === second.centerY
    && first.zoom === second.zoom;
}

export function transitionOwnedGraphCamera(
  camera: OwnedGraphCamera,
  target: Partial<OwnedGraphCameraPose>,
  durationMs: number | undefined,
  timestampMs: number,
): void {
  const duration = transitionDuration(durationMs);
  if (duration === 0) {
    applyCameraPose(camera, immediateCameraDestination(camera, target));
    camera.transition = null;
    return;
  }
  advanceOwnedGraphCameraTransition(camera, timestampMs);
  const destination = animatedCameraDestination(camera, target);
  if (sameCameraPose(destination, camera)) {
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

interface OwnedGraphBounds {
  maximumX: number;
  maximumY: number;
  minimumX: number;
  minimumY: number;
}

function nodeHalfExtent(extent: number | undefined, size: number | undefined): number {
  return Math.max(1, extent ? extent / 2 : size ?? 4);
}

function ownedGraphBounds(nodes: readonly FGNode[]): OwnedGraphBounds | null {
  const bounds: OwnedGraphBounds = {
    maximumX: Number.NEGATIVE_INFINITY,
    maximumY: Number.NEGATIVE_INFINITY,
    minimumX: Number.POSITIVE_INFINITY,
    minimumY: Number.POSITIVE_INFINITY,
  };
  let positionedNodeCount = 0;
  for (const node of nodes) {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) continue;
    const halfWidth = nodeHalfExtent(node.shapeSize2D?.width, node.size);
    const halfHeight = nodeHalfExtent(node.shapeSize2D?.height, node.size);
    bounds.minimumX = Math.min(bounds.minimumX, (node.x as number) - halfWidth);
    bounds.minimumY = Math.min(bounds.minimumY, (node.y as number) - halfHeight);
    bounds.maximumX = Math.max(bounds.maximumX, (node.x as number) + halfWidth);
    bounds.maximumY = Math.max(bounds.maximumY, (node.y as number) + halfHeight);
    positionedNodeCount += 1;
  }
  return positionedNodeCount > 0 ? bounds : null;
}

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
