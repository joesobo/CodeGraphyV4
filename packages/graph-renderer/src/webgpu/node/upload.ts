import type { GraphRendererFrame } from '../../contracts';
import type { GraphBufferState } from '../bufferState';
import { packNodePositions } from './positionBuffer';
import { uploadVertexStream } from '../vertexStream';

export function uploadNodeBuffers(
  device: GPUDevice,
  state: GraphBufferState,
  frame: GraphRendererFrame,
  positionsChanged: boolean,
  orderChanged: boolean,
  stylesChanged: boolean,
): void {
  if (positionsChanged || orderChanged) {
    state.nodePositionValues = packNodePositions(
      frame,
      state.nodeStyles.order.nodeIndexByRenderedIndex,
      state.nodePositionValues,
    );
    uploadVertexStream(
      device,
      state.nodePositionStream,
      state.nodePositionValues,
      state.nodePositionValues.byteLength,
    );
  }
  if (stylesChanged) {
    uploadVertexStream(
      device,
      state.nodeStyleStream,
      state.nodeStyles.values,
      state.nodeStyles.values.byteLength,
    );
  }
}
