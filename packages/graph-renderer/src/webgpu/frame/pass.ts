import type { GraphRendererFrame } from '../../contracts';
import type { GraphBufferState } from '../buffer/state';
import { cachedWebGpuColor } from '../color/parser';
import { drawLinks } from '../link/draw';
import { drawNodes } from '../node/draw';

export interface RenderPassResources {
  arrowCamera: GPUBindGroup;
  arrowPipeline: GPURenderPipeline;
  context: GPUCanvasContext;
  device: GPUDevice;
  linkCamera: GPUBindGroup;
  linkPipeline: GPURenderPipeline;
  nodeCamera: GPUBindGroup;
  nodePipeline: GPURenderPipeline;
}

export function submitRenderPass(
  resources: RenderPassResources,
  state: GraphBufferState,
  frame: GraphRendererFrame,
  hoveredIndex: number,
): void {
  const [red, green, blue, alpha] = cachedWebGpuColor(frame.backgroundColor);
  const encoder = resources.device.createCommandEncoder({ label: 'Graph frame' });
  const pass = encoder.beginRenderPass({
    label: 'Graph render pass',
    colorAttachments: [{
      clearValue: [red * alpha, green * alpha, blue * alpha, alpha],
      loadOp: 'clear',
      storeOp: 'store',
      view: resources.context.getCurrentTexture().createView(),
    }],
  });
  drawLinks(
    pass,
    frame,
    state,
    resources.linkPipeline,
    resources.linkCamera,
    resources.arrowPipeline,
    resources.arrowCamera,
  );
  drawNodes(pass, frame, state, resources.nodePipeline, resources.nodeCamera, hoveredIndex);
  pass.end();
  resources.device.queue.submit([encoder.finish()]);
}
