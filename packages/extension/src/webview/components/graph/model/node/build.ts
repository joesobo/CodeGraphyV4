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
import { seedTimelinePositions } from '../timeline/seeding';

export interface BuildGraphNodesOptions {
  nodes: IGraphNode[];
  edges: IGraphEdge[];
  nodeSizes: Map<string, number>;
  theme: ThemeKind;
  favorites: Set<string>;
  timelineActive: boolean;
  previousNodes?: Array<Pick<FGNode, 'id' | 'fx' | 'fy' | 'fz' | 'vx' | 'vy' | 'vz' | 'x' | 'y' | 'z'>>;
  random?: () => number;
}

interface PreviousNodeState {
  fx: number | undefined;
  fy: number | undefined;
  fz: number | undefined;
  vx: number | undefined;
  vy: number | undefined;
  vz: number | undefined;
  x: number | undefined;
  y: number | undefined;
  z: number | undefined;
}

function createPreviousNodeStateMap(
  previousNodes: Array<Pick<FGNode, 'id' | 'fx' | 'fy' | 'fz' | 'vx' | 'vy' | 'vz' | 'x' | 'y' | 'z'>>,
): Map<string, PreviousNodeState> {
  return new Map(previousNodes.map(node => [node.id, {
    fx: node.fx,
    fy: node.fy,
    fz: node.fz,
    vx: node.vx,
    vy: node.vy,
    vz: node.vz,
    x: node.x,
    y: node.y,
    z: node.z,
  }]));
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
  previousNodeStates: ReadonlyMap<string, PreviousNodeState>,
): FGNode {
  const rawColor = isLight ? adjustColorForLightTheme(node.color) : node.color;
  const isFavorite = options.favorites.has(node.id);
  const isFocused = node.depthLevel === 0;
  const size = (options.nodeSizes.get(node.id) ?? DEFAULT_NODE_SIZE) * getDepthSizeMultiplier(node.depthLevel);
  const previous = previousNodeStates.get(node.id);

  return {
    id: node.id,
    label: node.label,
    size,
    color: rawColor,
    borderColor: getNodeBorderColor(isFocused, isFavorite, isLight, rawColor),
    borderWidth: getNodeBorderWidth(isFocused, isFavorite),
    baseOpacity: getDepthOpacity(node.depthLevel),
    isFavorite,
    nodeType: node.nodeType,
    shape2D: node.shape2D,
    shape3D: node.shape3D,
    imageUrl: node.imageUrl,
    fx: previous?.fx,
    fy: previous?.fy,
    fz: previous?.fz,
    vx: previous?.vx,
    vy: previous?.vy,
    vz: previous?.vz,
    x: node.x ?? previous?.x,
    y: node.y ?? previous?.y,
    z: previous?.z,
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
  const previousNodeStates = createPreviousNodeStateMap(previousNodes);
  const graphNodes = nodes.map(node => createGraphNode(node, { nodeSizes, favorites }, isLight, previousNodeStates));

  seedTimelinePositions(graphNodes, edges, timelineActive ? previousNodeStates : null, random);

  return graphNodes;
}
