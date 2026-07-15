import type { GraphRendererFrame } from '../../contracts';
import { LINK_GEOMETRY_FLOATS, LINK_INSTANCE_STYLE_FLOATS } from '../buffer/layout';
import type { GraphBufferState } from '../buffer/state';
import { writeLinkGeometry } from './geometry/packing';
import { writeLinkStyle } from './style';

function resize(current: Float32Array, length: number): Float32Array {
  return current.length === length ? current : new Float32Array(length);
}

export function packLinks(
  state: GraphBufferState,
  frame: GraphRendererFrame,
  writeGeometry: boolean,
  writeStyle: boolean,
  writeArrows: boolean,
  nodeVisualScale: number,
): void {
  if (writeGeometry) {
    state.linkGeometryValues = resize(
      state.linkGeometryValues,
      state.renderedLinkCount * LINK_GEOMETRY_FLOATS,
    );
  }
  if (writeStyle) {
    state.linkStyleValues = resize(
      state.linkStyleValues,
      state.renderedLinkCount * LINK_INSTANCE_STYLE_FLOATS,
    );
  }
  for (let renderedIndex = 0; renderedIndex < state.renderedLinkCount; renderedIndex += 1) {
    const linkIndex = state.renderedLinkIndexes[renderedIndex];
    const link = frame.links[linkIndex];
    const curvature = link.curvature ?? 0;
    if (writeGeometry) writeLinkGeometry(
      state.linkGeometryValues,
      frame,
      linkIndex,
      renderedIndex,
      curvature,
      writeArrows,
      nodeVisualScale,
      state.nodeStyles.styles,
    );
    if (writeStyle) writeLinkStyle(
      state.linkStyleValues,
      state.linkStyles,
      link,
      linkIndex,
      renderedIndex,
      curvature,
    );
  }
}
