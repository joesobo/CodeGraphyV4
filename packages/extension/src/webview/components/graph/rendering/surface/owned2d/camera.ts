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

export {
  advanceOwnedGraphCameraTransition,
  cancelOwnedGraphCameraTransition,
  readOwnedGraphCameraTargetZoom,
  transitionOwnedGraphCamera,
} from './cameraTransition';
export { fitOwnedGraphCamera } from './cameraFit';
export { graphToScreen, screenToGraph } from './cameraCoordinates';
