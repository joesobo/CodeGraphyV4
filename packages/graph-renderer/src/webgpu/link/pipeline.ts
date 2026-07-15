import { LINK_SHADER } from '../shaders';
import { linkVertexBuffers } from './geometry/vertexLayout';

const alphaBlend: GPUBlendState = {
  color: { operation: 'add', srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' },
  alpha: { operation: 'add', srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
};

function pipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
  module: GPUShaderModule,
  arrow: boolean,
): GPURenderPipeline {
  const kind = arrow ? 'arrow' : 'link';
  return device.createRenderPipeline({
    label: `Graph ${kind} pipeline`,
    layout: 'auto',
    vertex: {
      entryPoint: arrow ? 'arrowVertexMain' : 'linkVertexMain',
      module,
      buffers: linkVertexBuffers(),
    },
    fragment: {
      entryPoint: arrow ? 'arrowFragmentMain' : 'linkFragmentMain',
      module,
      targets: [{ format, blend: alphaBlend }],
    },
    primitive: { topology: arrow ? 'triangle-list' : 'triangle-strip' },
  });
}

export function createLinkPipelines(
  device: GPUDevice,
  format: GPUTextureFormat,
): { arrow: GPURenderPipeline; link: GPURenderPipeline } {
  const module = device.createShaderModule({ code: LINK_SHADER, label: 'Graph link shader' });
  const link = pipeline(device, format, module, false);
  const arrow = pipeline(device, format, module, true);
  return { arrow, link };
}
