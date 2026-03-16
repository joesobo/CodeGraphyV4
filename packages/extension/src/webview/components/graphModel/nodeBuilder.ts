import type { IGraphEdge, IGraphNode } from '../../../shared/types';
import type { ThemeKind } from '../../hooks/useTheme';
import { adjustColorForLightTheme } from '../../hooks/useTheme';
import type { FGNode } from '../graphModel';
import {
  DEFAULT_NODE_SIZE,
  FAVORITE_BORDER_COLOR,
  getDepthOpacity,
  getDepthSizeMultiplier,
} from './nodeDisplay';

export interface BuildGraphNodesOptions {
  nodes: IGraphNode[];
  edges: IGraphEdge[];
  nodeSizes: Map<string, number>;
  theme: ThemeKind;
  favorites: Set<string>;
  timelineActive: boolean;
  previousNodes?: Array<Pick<FGNode, 'id' | 'x' | 'y'>>;
  random?: () => number;
}

export function buildGraphNodes(options: BuildGraphNodesOptions): FGNode[] {
  const {
    nodes,
    edges,
    nodeSizes,
    theme,
    favorites,
    timelineActive,
    previousNodes = [],
    random = Math.random,
  } = options;
  const isLight = theme === 'light';
  const previousPositions = timelineActive
    ? new Map(previousNodes.map(node => [node.id, { x: node.x, y: node.y }]))
    : null;

  const graphNodes: FGNode[] = nodes.map(node => {
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

  seedTimelinePositions(graphNodes, edges, previousPositions, random);

  return graphNodes;
}

function seedTimelinePositions(
  nodes: FGNode[],
  edges: IGraphEdge[],
  previousPositions: Map<string, { x: number | undefined; y: number | undefined }> | null,
  random: () => number
): void {
  if (!previousPositions || previousPositions.size === 0) return;

  const nodePositionMap = new Map(nodes.map(node => [node.id, node]));

  for (const node of nodes) {
    if (node.x !== undefined || node.y !== undefined) continue;

    const edge = edges.find(candidate => candidate.from === node.id || candidate.to === node.id);
    if (!edge) continue;

    const neighborId = edge.from === node.id ? edge.to : edge.from;
    const neighbor = nodePositionMap.get(neighborId);
    if (neighbor?.x === undefined || neighbor?.y === undefined) continue;

    node.x = neighbor.x + (random() - 0.5) * 40;
    node.y = neighbor.y + (random() - 0.5) * 40;
  }
}
