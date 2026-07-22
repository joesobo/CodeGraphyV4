import {
  FLOAT_BYTES,
  LINK_GEOMETRY_FLOATS,
  LINK_INSTANCE_STYLE_FLOATS,
} from '../../buffer/layout';

export function linkVertexBuffers(): GPUVertexBufferLayout[] {
  return [{
    arrayStride: LINK_GEOMETRY_FLOATS * FLOAT_BYTES,
    stepMode: 'instance',
    attributes: [
      { shaderLocation: 0, offset: 0, format: 'float32x2' },
      { shaderLocation: 1, offset: 2 * FLOAT_BYTES, format: 'float32x2' },
      { shaderLocation: 5, offset: 4 * FLOAT_BYTES, format: 'float32x2' },
    ],
  }, {
    arrayStride: LINK_INSTANCE_STYLE_FLOATS * FLOAT_BYTES,
    stepMode: 'instance',
    attributes: [
      { shaderLocation: 2, offset: 0, format: 'float32x2' },
      { shaderLocation: 3, offset: 2 * FLOAT_BYTES, format: 'float32x4' },
      { shaderLocation: 4, offset: 6 * FLOAT_BYTES, format: 'float32x4' },
      { shaderLocation: 6, offset: 10 * FLOAT_BYTES, format: 'float32' },
    ],
  }];
}
