import type { GraphRendererFrame } from '../contracts';
import type { GraphBufferState } from './buffer/state';

export function graphPositionsChanged(
  state: GraphBufferState,
  frame: GraphRendererFrame,
): boolean {
  return state.uploadedNodes !== frame.nodes
    || state.uploadedLinks !== frame.links
    || state.uploadedPositionVersion !== frame.positionVersion;
}

export function arrowGeometryChanged(
  state: GraphBufferState,
  arrowsVisible: boolean,
  nodeVisualScale: number,
): boolean {
  return arrowsVisible && (
    !state.uploadedArrowsVisible
    || state.uploadedNodeVisualScale !== nodeVisualScale
  );
}

export function rememberGraphBuffers(
  state: GraphBufferState,
  frame: GraphRendererFrame,
  edgeStride: number,
  arrowsVisible: boolean,
  nodeVisualScale: number,
): void {
  state.uploadedArrowsVisible = arrowsVisible;
  state.uploadedNodeVisualScale = nodeVisualScale;
  state.uploadedEdgeStride = edgeStride;
  state.uploadedPositionVersion = frame.positionVersion;
  state.uploadedNodes = frame.nodes;
  state.uploadedLinks = frame.links;
}
