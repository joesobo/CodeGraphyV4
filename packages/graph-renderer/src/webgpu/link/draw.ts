import { graphDetailOpacity } from '../../detailVisibility';
import type { GraphRendererFrame } from '../../contracts';
import type { GraphPassBufferState } from '../buffer/state';
import { GRAPH_LINK_SEGMENTS } from '../shaders';

export function drawLinks(
  pass: GPURenderPassEncoder,
  frame: GraphRendererFrame,
  state: GraphPassBufferState,
  linkPipeline: GPURenderPipeline,
  linkCamera: GPUBindGroup,
  arrowPipeline: GPURenderPipeline,
  arrowCamera: GPUBindGroup,
  includeArrows = true,
): void {
  if (state.renderedLinkCount === 0) return;
  pass.setPipeline(linkPipeline);
  pass.setBindGroup(0, linkCamera);
  pass.setVertexBuffer(0, state.linkGeometryStream.buffer);
  pass.setVertexBuffer(1, state.linkStyleStream.buffer);
  pass.draw((GRAPH_LINK_SEGMENTS + 1) * 2, state.renderedLinkCount);
  if (!includeArrows
    || frame.directionMode !== 'arrows'
    || graphDetailOpacity(frame.camera.zoom) === 0) return;
  pass.setPipeline(arrowPipeline);
  pass.setBindGroup(0, arrowCamera);
  pass.setVertexBuffer(0, state.linkGeometryStream.buffer);
  pass.setVertexBuffer(1, state.linkStyleStream.buffer);
  pass.draw(6, state.renderedLinkCount);
}
