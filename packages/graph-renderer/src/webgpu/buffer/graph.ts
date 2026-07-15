import { GRAPH_EDGE_HOVER_MIN_ZOOM, graphDetailOpacity } from '../../detailVisibility';
import type { GraphRendererFrame } from '../../contracts';
import { graphNodeWorldScale } from '../../visualSize';
import type { GraphBufferState } from './state';
import {
  arrowGeometryChanged,
  graphPositionsChanged,
  rememberGraphBuffers,
} from '../graphChange';
import { updateLinkRenderOrder } from '../link/order';
import { uploadLinkBuffers } from '../link/upload';
import { uploadNodeBuffers } from '../node/upload';
import type { StyleCacheUpdate } from '../styleCache';

function edgeStride(frame: GraphRendererFrame): number {
  return frame.links.length > 250_000 && frame.camera.zoom < GRAPH_EDGE_HOVER_MIN_ZOOM ? 2 : 1;
}

export function updateGraphBuffers(
  device: GPUDevice,
  state: GraphBufferState,
  frame: GraphRendererFrame,
  styleUpdate: StyleCacheUpdate,
): void {
  const stride = edgeStride(frame);
  const positionsChanged = graphPositionsChanged(state, frame);
  const strideChanged = state.uploadedEdgeStride !== stride;
  const orderChanged = updateLinkRenderOrder(state, frame, stride);
  const arrowsVisible = frame.directionMode === 'arrows'
    && graphDetailOpacity(frame.camera.zoom) > 0;
  const nodeVisualScale = graphNodeWorldScale(frame.camera.zoom);
  const geometryChanged = orderChanged
    || positionsChanged
    || styleUpdate.stylesChanged
    || strideChanged
    || arrowGeometryChanged(state, arrowsVisible, nodeVisualScale);
  uploadNodeBuffers(
    device,
    state,
    frame,
    positionsChanged,
    styleUpdate.nodeOrderChanged,
    styleUpdate.stylesChanged,
  );
  uploadLinkBuffers(
    device,
    state,
    frame,
    geometryChanged,
    styleUpdate.stylesChanged || orderChanged,
    arrowsVisible,
    nodeVisualScale,
  );
  rememberGraphBuffers(state, frame, stride, arrowsVisible, nodeVisualScale);
}
