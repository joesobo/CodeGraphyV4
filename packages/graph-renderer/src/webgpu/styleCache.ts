import type { GraphRendererFrame } from '../contracts';
import type { GraphBufferState, StyleIdentity } from './buffer/state';
import { createLinkStyles } from './link/style';

export interface StyleCacheUpdate {
  nodeOrderChanged: boolean;
  stylesChanged: boolean;
}

function styleIdentity(frame: GraphRendererFrame): StyleIdentity {
  return {
    arrowColor: frame.getArrowColor,
    linkColor: frame.getLinkColor,
    linkOpacity: frame.getLinkOpacity,
    linkWidth: frame.getLinkWidth,
    links: frame.links,
    nodes: frame.nodes,
    version: frame.styleVersion,
  };
}

function matches(frame: GraphRendererFrame, current: StyleIdentity | undefined): boolean {
  return current?.version === frame.styleVersion
    && current.nodes === frame.nodes
    && current.links === frame.links
    && current.arrowColor === frame.getArrowColor
    && current.linkColor === frame.getLinkColor
    && current.linkOpacity === frame.getLinkOpacity
    && current.linkWidth === frame.getLinkWidth;
}

export function updateStyleCache(
  state: GraphBufferState,
  frame: GraphRendererFrame,
): StyleCacheUpdate {
  if (matches(frame, state.styleIdentity)) {
    return { nodeOrderChanged: false, stylesChanged: false };
  }
  state.styleIdentity = styleIdentity(frame);
  const nodeOrderChanged = state.nodeStyles.update(frame);
  state.linkStyles = createLinkStyles(frame);
  return { nodeOrderChanged, stylesChanged: true };
}
