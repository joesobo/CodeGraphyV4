import type { LinkObject, NodeObject } from 'react-force-graph-2d';
import {
  type BidirectionalEdgeMode,
  DEFAULT_DIRECTION_COLOR,
  type IGraphData,
  type IGraphEdge,
  type IGraphNode,
  type NodeShape2D,
  type NodeShape3D,
  type NodeSizeMode,
} from '../../shared/types';
import type { ThemeKind } from '../hooks/useTheme';
import { adjustColorForLightTheme } from '../hooks/useTheme';
import { computeLinkCurvature } from '../lib/linkCurvature';

export const FAVORITE_BORDER_COLOR = '#EAB308';
const MIN_NODE_SIZE = 10;
const MAX_NODE_SIZE = 40;
export const DEFAULT_NODE_SIZE = 16;

export type FGNode = NodeObject & {
  id: string;
  label: string;
  size: number;
  color: string;
  borderColor: string;
  borderWidth: number;
  baseOpacity: number;
  isFavorite: boolean;
  shape2D?: NodeShape2D;
  shape3D?: NodeShape3D;
  imageUrl?: string;
};

export type FGLink = LinkObject & {
  id: string;
  from: string;
  to: string;
  bidirectional: boolean;
  baseColor?: string;
  curvature?: number;
};

export interface ProcessedEdge extends IGraphEdge {
  bidirectional?: boolean;
}

export interface BuildGraphDataOptions {
  data: IGraphData;
  nodeSizeMode: NodeSizeMode;
  theme: ThemeKind;
  favorites: Set<string>;
  bidirectionalMode: BidirectionalEdgeMode;
  timelineActive: boolean;
  previousNodes?: Array<Pick<FGNode, 'id' | 'x' | 'y'>>;
  random?: () => number;
}

/** Map normalized repelForce (0-20) to d3 forceManyBody strength (0 to -500) */
export function toD3Repel(repelForce: number): number {
  return -(repelForce / 20) * 500;
}

export function resolveDirectionColor(directionColor: string): string {
  return /^#[0-9A-F]{6}$/i.test(directionColor) ? directionColor : DEFAULT_DIRECTION_COLOR;
}

export function calculateNodeSizes(
  nodes: IGraphNode[],
  edges: { from: string; to: string }[],
  mode: NodeSizeMode
): Map<string, number> {
  const sizes = new Map<string, number>();

  if (mode === 'uniform') {
    for (const node of nodes) sizes.set(node.id, DEFAULT_NODE_SIZE);
    return sizes;
  }

  if (mode === 'connections') {
    const counts = new Map<string, number>();
    for (const node of nodes) counts.set(node.id, 0);
    for (const edge of edges) {
      counts.set(edge.from, (counts.get(edge.from) ?? 0) + 1);
      counts.set(edge.to, (counts.get(edge.to) ?? 0) + 1);
    }
    const vals = Array.from(counts.values());
    const min = Math.min(...vals, 0);
    const max = Math.max(...vals, 1);
    const range = max - min || 1;
    for (const node of nodes) {
      const count = counts.get(node.id) ?? 0;
      sizes.set(node.id, MIN_NODE_SIZE + ((count - min) / range) * (MAX_NODE_SIZE - MIN_NODE_SIZE));
    }
    return sizes;
  }

  if (mode === 'access-count') {
    const vals = nodes.map(n => n.accessCount ?? 0);
    const min = Math.min(...vals, 0);
    const max = Math.max(...vals, 1);
    const range = max - min || 1;
    for (const node of nodes) {
      const accessCount = node.accessCount ?? 0;
      sizes.set(node.id, MIN_NODE_SIZE + ((accessCount - min) / range) * (MAX_NODE_SIZE - MIN_NODE_SIZE));
    }
    return sizes;
  }

  if (mode === 'file-size') {
    const fileSizes = nodes.map(n => n.fileSize ?? 0).filter(size => size > 0);
    if (fileSizes.length === 0) {
      for (const node of nodes) sizes.set(node.id, DEFAULT_NODE_SIZE);
      return sizes;
    }

    const logSizes = fileSizes.map(size => Math.log10(size + 1));
    const minLog = Math.min(...logSizes);
    const maxLog = Math.max(...logSizes);
    const range = maxLog - minLog || 1;

    for (const node of nodes) {
      const fileSize = node.fileSize ?? 0;
      if (fileSize === 0) {
        sizes.set(node.id, MIN_NODE_SIZE);
        continue;
      }

      const logSize = Math.log10(fileSize + 1);
      sizes.set(node.id, MIN_NODE_SIZE + ((logSize - minLog) / range) * (MAX_NODE_SIZE - MIN_NODE_SIZE));
    }

    return sizes;
  }

  for (const node of nodes) sizes.set(node.id, DEFAULT_NODE_SIZE);
  return sizes;
}

export function getDepthOpacity(depthLevel: number | undefined): number {
  if (depthLevel === undefined) return 1.0;
  if (depthLevel === 0) return 1.0;
  return Math.max(0.4, 1.0 - depthLevel * 0.15);
}

export function getDepthSizeMultiplier(depthLevel: number | undefined): number {
  if (depthLevel === undefined) return 1.0;
  if (depthLevel === 0) return 1.3;
  return 1.0;
}

export function getNodeType(filePath: string): string {
  const dotIndex = filePath.lastIndexOf('.');
  if (dotIndex === -1 || dotIndex === filePath.length - 1) {
    return '*';
  }
  return filePath.slice(dotIndex).toLowerCase();
}

export function processEdges(edges: IGraphEdge[], mode: BidirectionalEdgeMode): ProcessedEdge[] {
  if (mode === 'separate') return edges.map(edge => ({ ...edge, bidirectional: false }));

  const edgeSet = new Set(edges.map(edge => `${edge.from}->${edge.to}`));
  const processed: ProcessedEdge[] = [];
  const seen = new Set<string>();

  for (const edge of edges) {
    const key = `${edge.from}->${edge.to}`;
    const reverseKey = `${edge.to}->${edge.from}`;

    if (seen.has(key) || seen.has(reverseKey)) continue;

    if (edgeSet.has(reverseKey)) {
      const [nodeA, nodeB] = [edge.from, edge.to].sort();
      processed.push({ id: `${nodeA}<->${nodeB}`, from: nodeA, to: nodeB, bidirectional: true });
      seen.add(key);
      seen.add(reverseKey);
      continue;
    }

    processed.push({ ...edge, bidirectional: false });
    seen.add(key);
  }

  return processed;
}

export function buildGraphData(options: BuildGraphDataOptions): { nodes: FGNode[]; links: FGLink[] } {
  const {
    data,
    nodeSizeMode,
    theme,
    favorites,
    bidirectionalMode,
    timelineActive,
    previousNodes = [],
    random = Math.random,
  } = options;

  const nodeSizes = calculateNodeSizes(data.nodes, data.edges, nodeSizeMode);
  const isLight = theme === 'light';
  const previousPositions = timelineActive
    ? new Map(previousNodes.map(node => [node.id, { x: node.x, y: node.y }]))
    : null;

  const nodes: FGNode[] = data.nodes.map(node => {
    const rawColor = isLight ? adjustColorForLightTheme(node.color) : node.color;
    const isFavorite = favorites.has(node.id);
    const isFocused = node.depthLevel === 0;
    const size = (nodeSizes.get(node.id) ?? DEFAULT_NODE_SIZE) * getDepthSizeMultiplier(node.depthLevel);
    const borderColor = isFocused
      ? (isLight ? '#2563eb' : '#60a5fa')
      : isFavorite
        ? FAVORITE_BORDER_COLOR
        : rawColor;
    const borderWidth = isFocused ? 4 : isFavorite ? 3 : 2;
    const previous = previousPositions?.get(node.id);

    return {
      id: node.id,
      label: node.label,
      size,
      color: rawColor,
      borderColor,
      borderWidth,
      baseOpacity: getDepthOpacity(node.depthLevel),
      isFavorite,
      shape2D: node.shape2D,
      shape3D: node.shape3D,
      imageUrl: node.imageUrl,
      x: node.x ?? previous?.x,
      y: node.y ?? previous?.y,
    } as FGNode;
  });

  if (previousPositions && previousPositions.size > 0) {
    const nodePositionMap = new Map(nodes.map(node => [node.id, node]));

    for (const node of nodes) {
      if (node.x !== undefined || node.y !== undefined) continue;

      const edge = data.edges.find(candidate => candidate.from === node.id || candidate.to === node.id);
      if (!edge) continue;

      const neighborId = edge.from === node.id ? edge.to : edge.from;
      const neighbor = nodePositionMap.get(neighborId);
      if (neighbor?.x === undefined || neighbor?.y === undefined) continue;

      node.x = neighbor.x + (random() - 0.5) * 40;
      node.y = neighbor.y + (random() - 0.5) * 40;
    }
  }

  const processedEdges = processEdges(data.edges, bidirectionalMode);
  const links: FGLink[] = processedEdges.map(edge => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    bidirectional: edge.bidirectional ?? false,
    baseColor: edge.bidirectional ? '#60a5fa' : undefined,
  } as FGLink));

  computeLinkCurvature(links);

  return { nodes, links };
}
