import type { GraphRendererFrame } from '../../contracts';
import { NODE_POSITION_FLOATS } from '../bufferLayout';

export function packNodePositions(
  frame: GraphRendererFrame,
  nodeIndexByRenderedIndex: Uint32Array,
  current: Float32Array,
): Float32Array {
  const required = frame.nodes.length * NODE_POSITION_FLOATS;
  const output = current.length === required ? current : new Float32Array(required);
  for (let renderedIndex = 0; renderedIndex < frame.nodes.length; renderedIndex += 1) {
    const nodeIndex = nodeIndexByRenderedIndex[renderedIndex];
    const offset = renderedIndex * NODE_POSITION_FLOATS;
    output[offset] = frame.nodeX[nodeIndex] ?? 0;
    output[offset + 1] = frame.nodeY[nodeIndex] ?? 0;
  }
  return output;
}
