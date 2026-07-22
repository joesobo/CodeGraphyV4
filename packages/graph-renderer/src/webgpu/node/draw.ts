import type { GraphRendererFrame } from '../../contracts';
import type { GraphPassBufferState } from '../buffer/state';

export function drawNodes(
  pass: GPURenderPassEncoder,
  frame: GraphRendererFrame,
  state: GraphPassBufferState,
  pipeline: GPURenderPipeline,
  camera: GPUBindGroup,
  hoveredIndex: number,
): void {
  if (frame.nodes.length === 0) return;
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, camera);
  pass.setVertexBuffer(0, state.nodePositionStream.buffer);
  pass.setVertexBuffer(1, state.nodeStyleStream.buffer);
  if (hoveredIndex < 0 || hoveredIndex >= frame.nodes.length) {
    pass.draw(6, frame.nodes.length);
    return;
  }
  if (hoveredIndex > 0) pass.draw(6, hoveredIndex, 0, 0);
  const nodesAfterHover = frame.nodes.length - hoveredIndex - 1;
  if (nodesAfterHover > 0) pass.draw(6, nodesAfterHover, 0, hoveredIndex + 1);
  pass.draw(6, 1, 0, hoveredIndex);
}
