import type { IGraphEdge, IGraphNode } from '../../../../../shared/graph/contracts';
import type { ThemeKind } from '../../../../theme/useTheme';
import { adjustColorForLightTheme } from '../../../../theme/useTheme';
import type { FGNode } from '../build';
import {
  DEFAULT_NODE_SIZE,
  FAVORITE_BORDER_COLOR,
  getDepthOpacity,
  getDepthSizeMultiplier,
} from './display';
import { seedTimelinePositions } from '../timelinePositionSeeding';

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

function createPreviousPositionMap(
  timelineActive: boolean,
  previousNodes: Array<Pick<FGNode, 'id' | 'x' | 'y'>>,
): Map<string, { x: number | undefined; y: number | undefined }> | null {
  return timelineActive
    ? new Map(previousNodes.map(node => [node.id, { x: node.x, y: node.y }]))
    : null;
}

function getNodeBorderColor(
  isFocused: boolean,
  isFavorite: boolean,
  isLight: boolean,
  rawColor: string,
): string {
  if (isFocused) {
    return isLight ? '#2563eb' : '#60a5fa';
  }

  return isFavorite ? FAVORITE_BORDER_COLOR : rawColor;
}

function getNodeBorderWidth(isFocused: boolean, isFavorite: boolean): number {
  if (isFocused) {
    return 4;
  }

  return isFavorite ? 3 : 2;
}

function createGraphNode(
  node: IGraphNode,
  options: Pick<BuildGraphNodesOptions, 'nodeSizes' | 'favorites'>,
  isLight: boolean,
  previousPositions: ReadonlyMap<string, { x: number | undefined; y: number | undefined }> | null,
): FGNode {
  const rawColor = isLight ? adjustColorForLightTheme(node.color) : node.color;
  const isFavorite = options.favorites.has(node.id);
  const isFocused = node.depthLevel === 0;
  const size = (options.nodeSizes.get(node.id) ?? DEFAULT_NODE_SIZE) * getDepthSizeMultiplier(node.depthLevel);
  const previous = previousPositions?.get(node.id);

  return {
    id: node.id,
    label: node.label,
    size,
    color: rawColor,
    borderColor: getNodeBorderColor(isFocused, isFavorite, isLight, rawColor),
    borderWidth: getNodeBorderWidth(isFocused, isFavorite),
    baseOpacity: getDepthOpacity(node.depthLevel),
    isFavorite,
    shape2D: node.shape2D,
    shape3D: node.shape3D,
    imageUrl: node.imageUrl,
    x: node.x ?? previous?.x,
    y: node.y ?? previous?.y,
  } as FGNode;
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
  const previousPositions = createPreviousPositionMap(timelineActive, previousNodes);
  const graphNodes = nodes.map(node => createGraphNode(node, { nodeSizes, favorites }, isLight, previousPositions));

  seedTimelinePositions(graphNodes, edges, previousPositions, random);

  return graphNodes;
}
