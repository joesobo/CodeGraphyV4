import {
  measureGraphSceneFit,
  type GraphRendererLink,
  type GraphRendererNode,
  type GraphRendererNodeStyle,
} from '@codegraphy-dev/graph-renderer';
import type { MinimapProjection } from './projection';

export interface MinimapScene {
  getNodeStyle(this: void, node: GraphRendererNode): GraphRendererNodeStyle;
  links: readonly GraphRendererLink[];
  nodes: readonly GraphRendererNode[];
}

function axisFitZoom(span: number, nodeHalfSize: number, available: number): number {
  if (span <= Number.EPSILON) {
    return nodeHalfSize > 0
      ? (available / (nodeHalfSize * 2)) ** 2
      : Number.POSITIVE_INFINITY;
  }
  const rootZoom = (
    Math.sqrt(nodeHalfSize ** 2 + span * available) - nodeHalfSize
  ) / span;
  return rootZoom ** 2;
}

export function fitMinimapSceneProjection(
  scene: MinimapScene,
  size: number,
  padding: number,
): MinimapProjection | undefined {
  const available = Math.max(1, size - padding * 2);
  const measurement = measureGraphSceneFit(scene);
  if (!measurement) return undefined;
  const { bounds, maxNodeHalfHeight, maxNodeHalfWidth } = measurement;
  const zoom = Math.min(
    axisFitZoom(bounds.maxX - bounds.minX, maxNodeHalfWidth, available),
    axisFitZoom(bounds.maxY - bounds.minY, maxNodeHalfHeight, available),
  );
  return {
    centerX: (bounds.minX + bounds.maxX) / 2,
    centerY: (bounds.minY + bounds.maxY) / 2,
    padding,
    size,
    zoom,
  };
}
