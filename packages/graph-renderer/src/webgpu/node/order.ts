import type { GraphRendererNodeStyle } from '../../contracts';
import {
  createGraphNodeStackingOrder,
  graphNodeDrawnArea,
} from '../../nodeStacking';

export interface NodeRenderOrder {
  areas: Float64Array;
  nodeIndexByRenderedIndex: Uint32Array;
  renderedIndexByNodeIndex: Int32Array;
}

export function createNodeRenderOrder(
  styles: readonly GraphRendererNodeStyle[],
  previousAreas: Float64Array,
): { changed: boolean; order: NodeRenderOrder } {
  const areas = Float64Array.from(
    styles,
    style => graphNodeDrawnArea(style.width, style.height),
  );
  let changed = areas.length !== previousAreas.length;
  for (let index = 0; !changed && index < areas.length; index += 1) {
    changed = areas[index] !== previousAreas[index];
  }
  const nodeIndexByRenderedIndex = createGraphNodeStackingOrder(styles);
  const renderedIndexByNodeIndex = new Int32Array(nodeIndexByRenderedIndex.length);
  nodeIndexByRenderedIndex.forEach((nodeIndex, renderedIndex) => {
    renderedIndexByNodeIndex[nodeIndex] = renderedIndex;
  });
  return {
    changed,
    order: { areas, nodeIndexByRenderedIndex, renderedIndexByNodeIndex },
  };
}
