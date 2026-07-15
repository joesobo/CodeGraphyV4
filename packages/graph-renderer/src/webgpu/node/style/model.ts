import type { GraphNodeShape, GraphRendererNodeStyle } from '../../../contracts';
import { NODE_STYLE_FLOATS } from '../../buffer/layout';
import { cachedWebGpuColor } from '../../color/parser';

export function webGpuNodeShapeCode(shape: GraphNodeShape): number {
  switch (shape) {
    case 'circle': return 0;
    case 'square': return 1;
    case 'rectangle': return 2;
    case 'diamond': return 3;
    case 'triangle': return 4;
    case 'hexagon': return 5;
    case 'star': return 6;
  }
}

export function writeNodeStyle(
  output: Float32Array,
  index: number,
  style: GraphRendererNodeStyle,
): void {
  const offset = index * NODE_STYLE_FLOATS;
  output[offset] = Math.max(0.5, style.width / 2);
  output[offset + 1] = Math.max(0.5, style.height / 2);
  output.set(cachedWebGpuColor(style.fillColor), offset + 2);
  output[offset + 5] *= style.opacity * style.fillOpacity;
  output.set(cachedWebGpuColor(style.borderColor), offset + 6);
  output[offset + 9] *= style.opacity;
  output[offset + 10] = webGpuNodeShapeCode(style.shape);
  output[offset + 11] = Math.max(0, style.borderWidth);
  output[offset + 12] = Math.max(0, style.cornerRadius);
}
