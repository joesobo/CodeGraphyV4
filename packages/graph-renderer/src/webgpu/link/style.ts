import type { GraphRendererFrame, GraphRendererLink } from '../../contracts';
import { LINK_CACHED_STYLE_FLOATS, LINK_INSTANCE_STYLE_FLOATS } from '../bufferLayout';
import { cachedWebGpuColor } from '../color/parser';

export function createLinkStyles(frame: GraphRendererFrame): Float32Array {
  const output = new Float32Array(frame.links.length * LINK_CACHED_STYLE_FLOATS);
  frame.links.forEach((link, index) => {
    const offset = index * LINK_CACHED_STYLE_FLOATS;
    output[offset] = Math.max(0.35, frame.getLinkWidth(link) / 2);
    output.set(cachedWebGpuColor(frame.getLinkColor(link)), offset + 1);
    output[offset + 4] *= Math.max(0, Math.min(1, frame.getLinkOpacity(link)));
    output.set(cachedWebGpuColor(frame.getArrowColor(link)), offset + 5);
  });
  return output;
}

export function writeLinkStyle(
  output: Float32Array,
  cached: Float32Array,
  link: GraphRendererLink,
  linkIndex: number,
  renderedIndex: number,
  curvature: number,
): void {
  const offset = renderedIndex * LINK_INSTANCE_STYLE_FLOATS;
  const cachedOffset = linkIndex * LINK_CACHED_STYLE_FLOATS;
  output[offset] = cached[cachedOffset];
  output[offset + 1] = curvature;
  output.set(
    cached.subarray(cachedOffset + 1, cachedOffset + LINK_CACHED_STYLE_FLOATS),
    offset + 2,
  );
  output[offset + 10] = link.bidirectional ? 1 : 0;
}
