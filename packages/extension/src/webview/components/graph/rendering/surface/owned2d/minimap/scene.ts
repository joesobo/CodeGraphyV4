import {
  measureGraphSceneBounds,
  type GraphRendererLink,
  type GraphRendererNode,
  type GraphRendererNodeStyle,
  type GraphSceneBounds,
} from '@codegraphy-dev/graph-renderer';
import type { MinimapProjection } from './projection';

const MINIMUM_FIT_ZOOM = 0.0001;
const MAXIMUM_FIT_ZOOM = 1_000_000;
const FIT_SEARCH_STEPS = 24;

export interface MinimapScene {
  getNodeStyle(this: void, node: GraphRendererNode): GraphRendererNodeStyle;
  links: readonly GraphRendererLink[];
  nodes: readonly GraphRendererNode[];
}

function requiredZoom(bounds: GraphSceneBounds, available: number): number {
  const width = Math.max(Number.EPSILON, bounds.maxX - bounds.minX);
  const height = Math.max(Number.EPSILON, bounds.maxY - bounds.minY);
  return Math.min(available / width, available / height);
}

function sceneFits(scene: MinimapScene, zoom: number, available: number): boolean {
  const bounds = measureGraphSceneBounds({ ...scene, zoom });
  return Boolean(bounds && zoom <= requiredZoom(bounds, available));
}

function findFitZoom(scene: MinimapScene, available: number): number {
  let lower = MINIMUM_FIT_ZOOM;
  let upper = 1;
  while (upper < MAXIMUM_FIT_ZOOM && sceneFits(scene, upper, available)) {
    lower = upper;
    upper *= 2;
  }
  for (let step = 0; step < FIT_SEARCH_STEPS; step += 1) {
    const candidate = (lower + upper) / 2;
    if (sceneFits(scene, candidate, available)) lower = candidate;
    else upper = candidate;
  }
  return lower;
}

export function fitMinimapSceneProjection(
  scene: MinimapScene,
  size: number,
  padding: number,
): MinimapProjection | undefined {
  const available = Math.max(1, size - padding * 2);
  const zoom = findFitZoom(scene, available);
  const bounds = measureGraphSceneBounds({ ...scene, zoom });
  if (!bounds) return undefined;
  return {
    centerX: (bounds.minX + bounds.maxX) / 2,
    centerY: (bounds.minY + bounds.maxY) / 2,
    padding,
    size,
    zoom,
  };
}
