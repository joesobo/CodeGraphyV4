import { FLOAT_BYTES, NODE_POSITION_FLOATS, NODE_STYLE_FLOATS } from '../buffer/layout';
import { NODE_SHADER } from '../shaders';

const alphaBlend: GPUBlendState = {
  color: { operation: 'add', srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' },
  alpha: { operation: 'add', srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
};

export function createNodePipeline(
  device: GPUDevice,
  format: GPUTextureFormat,
): GPURenderPipeline {
  const module = device.createShaderModule({ code: NODE_SHADER, label: 'Graph node shader' });
  return device.createRenderPipeline({
    label: 'Graph node pipeline',
    layout: 'auto',
    vertex: {
      entryPoint: 'vertexMain',
      module,
      buffers: [{
        arrayStride: NODE_POSITION_FLOATS * FLOAT_BYTES,
        stepMode: 'instance',
        attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }],
      }, {
        arrayStride: NODE_STYLE_FLOATS * FLOAT_BYTES,
        stepMode: 'instance',
        attributes: [
          { shaderLocation: 1, offset: 0, format: 'float32x2' },
          { shaderLocation: 2, offset: 2 * FLOAT_BYTES, format: 'float32x4' },
          { shaderLocation: 3, offset: 6 * FLOAT_BYTES, format: 'float32x4' },
          { shaderLocation: 4, offset: 10 * FLOAT_BYTES, format: 'float32x3' },
        ],
      }],
    },
    fragment: { entryPoint: 'fragmentMain', module, targets: [{ format, blend: alphaBlend }] },
    primitive: { topology: 'triangle-list' },
  });
}
