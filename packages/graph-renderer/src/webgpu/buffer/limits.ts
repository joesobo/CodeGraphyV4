import { GRAPH_EDGE_HOVER_MIN_ZOOM } from '../../detailVisibility';
import type { GraphRendererFrame } from '../../contracts';
import {
  FLOAT_BYTES,
  LINK_GEOMETRY_FLOATS,
  LINK_INSTANCE_STYLE_FLOATS,
  NODE_POSITION_FLOATS,
  NODE_STYLE_FLOATS,
} from './layout';

function validateBufferRequirement(
  label: string,
  count: number,
  floatsPerItem: number,
  maximumBytes: number,
): void {
  const requiredBytes = count * floatsPerItem * FLOAT_BYTES;
  if (!Number.isSafeInteger(requiredBytes)) {
    throw new RangeError(`WebGPU ${label} size exceeds the safe integer range`);
  }
  if (requiredBytes > maximumBytes) {
    throw new RangeError(
      `WebGPU ${label} require ${requiredBytes} bytes; device maxBufferSize is ${maximumBytes} bytes`,
    );
  }
}

export function graphEdgeStride(frame: GraphRendererFrame): number {
  return frame.links.length > 250_000 && frame.camera.zoom < GRAPH_EDGE_HOVER_MIN_ZOOM ? 2 : 1;
}

export function validateGraphBufferLimits(
  frame: GraphRendererFrame,
  maximumBytes: number,
): void {
  const maximumRenderedLinks = Math.ceil(frame.links.length / graphEdgeStride(frame));
  validateBufferRequirement('node positions', frame.nodes.length, NODE_POSITION_FLOATS, maximumBytes);
  validateBufferRequirement('node styles', frame.nodes.length, NODE_STYLE_FLOATS, maximumBytes);
  validateBufferRequirement('link geometry', maximumRenderedLinks, LINK_GEOMETRY_FLOATS, maximumBytes);
  validateBufferRequirement('link styles', maximumRenderedLinks, LINK_INSTANCE_STYLE_FLOATS, maximumBytes);
}
