import type { GraphRendererFrame } from '../../contracts';
import { FLOAT_BYTES, LINK_GEOMETRY_FLOATS, LINK_INSTANCE_STYLE_FLOATS } from '../bufferLayout';
import type { GraphBufferState } from '../bufferState';
import { packLinks } from './packing';
import { uploadVertexStream } from '../vertexStream';

export function uploadLinkBuffers(
  device: GPUDevice,
  state: GraphBufferState,
  frame: GraphRendererFrame,
  geometryChanged: boolean,
  stylesChanged: boolean,
  arrowsVisible: boolean,
  nodeVisualScale: number,
): void {
  if (geometryChanged || stylesChanged) {
    packLinks(state, frame, geometryChanged, stylesChanged, arrowsVisible, nodeVisualScale);
  }
  if (geometryChanged) {
    uploadVertexStream(
      device,
      state.linkGeometryStream,
      state.linkGeometryValues,
      state.renderedLinkCount * LINK_GEOMETRY_FLOATS * FLOAT_BYTES,
    );
  }
  if (stylesChanged) {
    uploadVertexStream(
      device,
      state.linkStyleStream,
      state.linkStyleValues,
      state.renderedLinkCount * LINK_INSTANCE_STYLE_FLOATS * FLOAT_BYTES,
    );
  }
}
