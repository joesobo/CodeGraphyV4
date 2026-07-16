import {
  measureGraphSceneFit,
  type GraphSceneFitMeasurement,
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

export type MinimapSceneMeasurement = GraphSceneFitMeasurement;

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

export function measureMinimapScene(
  scene: MinimapScene,
): MinimapSceneMeasurement | undefined {
  return measureGraphSceneFit(scene);
}

export function expandMinimapSceneMeasurement(
  previous: MinimapSceneMeasurement | undefined,
  current: MinimapSceneMeasurement,
): MinimapSceneMeasurement {
  if (!previous) return current;
  return {
    bounds: {
      maxX: Math.max(previous.bounds.maxX, current.bounds.maxX),
      maxY: Math.max(previous.bounds.maxY, current.bounds.maxY),
      minX: Math.min(previous.bounds.minX, current.bounds.minX),
      minY: Math.min(previous.bounds.minY, current.bounds.minY),
    },
    maxNodeHalfHeight: Math.max(previous.maxNodeHalfHeight, current.maxNodeHalfHeight),
    maxNodeHalfWidth: Math.max(previous.maxNodeHalfWidth, current.maxNodeHalfWidth),
  };
}

export function fitMinimapSceneMeasurement(
  measurement: MinimapSceneMeasurement,
  size: number,
  padding: number,
): MinimapProjection {
  const available = Math.max(1, size - padding * 2);
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

export function fitMinimapSceneProjection(
  scene: MinimapScene,
  size: number,
  padding: number,
): MinimapProjection | undefined {
  const measurement = measureMinimapScene(scene);
  return measurement
    ? fitMinimapSceneMeasurement(measurement, size, padding)
    : undefined;
}
