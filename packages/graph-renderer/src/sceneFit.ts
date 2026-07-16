import type {
  GraphRendererLink,
  GraphRendererNode,
  GraphRendererNodeStyle,
} from './contracts';
import type { GraphSceneBounds } from './sceneBounds';
import { GRAPH_LINK_SEGMENTS } from './webgpu/shaders';
import { resolveGraphLinkGeometry } from './webgpu/link/geometry/model';
import { pointOnGraphLink } from './webgpu/link/geometry/point';

export interface GraphSceneFitInput {
  getNodeStyle(this: void, node: GraphRendererNode): GraphRendererNodeStyle;
  links: readonly GraphRendererLink[];
  nodes: readonly GraphRendererNode[];
}

export interface GraphSceneFitMeasurement {
  bounds: GraphSceneBounds;
  maxNodeHalfHeight: number;
  maxNodeHalfWidth: number;
}

function includePoint(bounds: GraphSceneBounds, x: number, y: number): void {
  bounds.maxX = Math.max(bounds.maxX, x);
  bounds.maxY = Math.max(bounds.maxY, y);
  bounds.minX = Math.min(bounds.minX, x);
  bounds.minY = Math.min(bounds.minY, y);
}

function includeLinks(bounds: GraphSceneBounds, links: readonly GraphRendererLink[]): void {
  for (const link of links) {
    const geometry = resolveGraphLinkGeometry(link);
    if (!geometry) continue;
    for (let segment = 0; segment <= GRAPH_LINK_SEGMENTS; segment += 1) {
      const point = pointOnGraphLink(geometry, segment / GRAPH_LINK_SEGMENTS);
      includePoint(bounds, point.x, point.y);
    }
  }
}

export function measureGraphSceneFit(
  input: GraphSceneFitInput,
): GraphSceneFitMeasurement | undefined {
  const bounds = {
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
  };
  let maxNodeHalfHeight = 0;
  let maxNodeHalfWidth = 0;
  for (const node of input.nodes) {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) continue;
    includePoint(bounds, node.x as number, node.y as number);
    const style = input.getNodeStyle(node);
    maxNodeHalfWidth = Math.max(maxNodeHalfWidth, Math.max(0.5, style.width / 2));
    maxNodeHalfHeight = Math.max(maxNodeHalfHeight, Math.max(0.5, style.height / 2));
  }
  includeLinks(bounds, input.links);
  if (!Number.isFinite(bounds.minX)) return undefined;
  return { bounds, maxNodeHalfHeight, maxNodeHalfWidth };
}
