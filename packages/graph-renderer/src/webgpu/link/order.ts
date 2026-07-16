import type { GraphRendererFrame, GraphRendererLink } from '../../contracts';
import type { GraphBufferState } from '../buffer/state';

function orderMatches(
  state: GraphBufferState,
  frame: GraphRendererFrame,
  edgeStride: number,
): boolean {
  return state.indexedLinks === frame.links
    && state.indexedEdgeSources === frame.edgeSources
    && state.indexedEdgeTargets === frame.edgeTargets
    && state.indexedNodeCount === frame.nodes.length
    && state.indexedEdgeStride === edgeStride;
}

function isRenderable(frame: GraphRendererFrame, linkIndex: number): boolean {
  return frame.edgeSources[linkIndex] < frame.nodes.length
    && frame.edgeTargets[linkIndex] < frame.nodes.length;
}

export function updateLinkRenderOrder(
  state: GraphBufferState,
  frame: GraphRendererFrame,
  edgeStride: number,
): boolean {
  if (orderMatches(state, frame, edgeStride)) return false;
  const indexes = new Uint32Array(Math.ceil(frame.links.length / edgeStride));
  const indexByLink = new WeakMap<GraphRendererLink, number>();
  let renderedCount = 0;
  for (let linkIndex = 0; linkIndex < frame.links.length; linkIndex += edgeStride) {
    if (!isRenderable(frame, linkIndex)) continue;
    indexes[renderedCount] = linkIndex;
    indexByLink.set(frame.links[linkIndex], renderedCount);
    renderedCount += 1;
  }
  state.indexedLinks = frame.links;
  state.indexedEdgeSources = frame.edgeSources;
  state.indexedEdgeTargets = frame.edgeTargets;
  state.indexedNodeCount = frame.nodes.length;
  state.indexedEdgeStride = edgeStride;
  state.renderedLinkCount = renderedCount;
  state.renderedLinkIndexes = renderedCount === indexes.length
    ? indexes
    : indexes.slice(0, renderedCount);
  state.renderedLinkIndexByLink = indexByLink;
  return true;
}
