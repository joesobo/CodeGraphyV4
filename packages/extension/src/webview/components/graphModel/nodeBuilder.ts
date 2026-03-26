import type { IGraphEdge, IGraphNode } from '../../../shared/contracts';
import type { ThemeKind } from '../../useTheme';
import { adjustColorForLightTheme } from '../../useTheme';
import type { FGNode } from '../graphModel';
import {
  DEFAULT_NODE_SIZE,
  FAVORITE_BORDER_COLOR,
  getDepthOpacity,
  getDepthSizeMultiplier,
} from './nodeDisplay';
import { seedTimelinePositions } from './timelinePositionSeeding';

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

