import type { IGraphEdge, IGraphNode } from '../../../../../shared/graph/contracts';
import type { ThemeKind } from '../../../../theme/useTheme';
import { adjustColorForLightTheme } from '../../../../theme/useTheme';
import { DEFAULT_GRAPH_APPEARANCE, type GraphAppearance } from '../../appearance/model';
import type { FGNode } from '../build';
import {
  DEFAULT_NODE_SIZE,
  FAVORITE_BORDER_COLOR,
  FALLBACK_MUTED_NODE_COLOR,
  getDepthOpacity,
  getDepthSizeMultiplier,
} from './display';
import { seedTimelinePositions } from '../timeline/seeding';

export interface BuildGraphNodesOptions {
  nodes: IGraphNode[];
  edges: IGraphEdge[];
  appearance?: GraphAppearance;
  nodeSizes: Map<string, number>;
  theme: ThemeKind;
  favorites: Set<string>;
  graphMode?: '2d' | '3d';
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

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function getNodeBorderColor(
  isFocused: boolean,
  isFavorite: boolean,
  appearance: Pick<GraphAppearance, 'focusBorder'>,
  nodeColor: string,
): string {
  if (isFocused) {
    return appearance.focusBorder;
  }

  return isFavorite ? FAVORITE_BORDER_COLOR : nodeColor;
}

function getNodeBorderWidth(isFocused: boolean, isFavorite: boolean): number {
  if (isFocused) {
    return 4;
  }

  return isFavorite ? 3 : 2;
}

interface GraphNodeStyle {
  baseOpacity: number;
  borderColor: string;
  borderWidth: number;
  color: string;
  isFavorite: boolean;
  size: number;
}

interface GraphNodePositionState {
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

interface RuntimeGraphNodePositionState {
  fx?: unknown;
  fy?: unknown;
  fz?: unknown;
  vx?: unknown;
  vy?: unknown;
  vz?: unknown;
}

interface RuntimeGraphNodePresentation {
  [key: string]: unknown;
  ownerPluginId?: string;
  runtimeNodeType?: string;
  size?: number;
}

function createGraphNodeStyle(
  node: IGraphNode,
  options: {
    appearance: GraphAppearance;
    favorites: ReadonlySet<string>;
    nodeSizes: ReadonlyMap<string, number>;
  },
  isLight: boolean,
): GraphNodeStyle {
  const rawColor = isLight ? adjustColorForLightTheme(node.color) : node.color;
  const displayColor = getNodeColor(node, rawColor, options.appearance);
  const isFavorite = options.favorites.has(node.id);
  const isFocused = node.depthLevel === 0;
  const runtimePresentation = node as IGraphNode & RuntimeGraphNodePresentation;
  const size = typeof runtimePresentation.size === 'number'
    ? runtimePresentation.size
    : (options.nodeSizes.get(node.id) ?? DEFAULT_NODE_SIZE) * getDepthSizeMultiplier(node.depthLevel);

  return {
    baseOpacity: getNodeBaseOpacity(node),
    borderColor: getNodeBorderColor(isFocused, isFavorite, options.appearance, displayColor),
    borderWidth: getNodeBorderWidth(isFocused, isFavorite),
    color: displayColor,
    isFavorite,
    size,
  };
}

function getNodeBaseOpacity(node: IGraphNode): number {
  const depthOpacity = getDepthOpacity(node.depthLevel);
  return node.metadata?.gitIgnored === true
    ? Math.min(depthOpacity, 0.45)
    : depthOpacity;
}

function parseHexColor(color: string): [number, number, number] | undefined {
  const match = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!match) {
    return undefined;
  }

  const value = match[1];
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

function toHexChannel(value: number): string {
  return Math.round(value).toString(16).padStart(2, '0');
}

function mixHexColors(source: string, target: string, amount: number): string {
  const sourceRgb = parseHexColor(source);
  const targetRgb = parseHexColor(target) ?? parseHexColor(FALLBACK_MUTED_NODE_COLOR);
  if (!sourceRgb || !targetRgb) {
    return source;
  }

  const mixed = sourceRgb.map((channel, index) =>
    channel + (targetRgb[index] - channel) * amount
  );
  return `#${mixed.map(toHexChannel).join('')}`;
}

function getNodeColor(
  node: IGraphNode,
  nodeColor: string,
  appearance: Pick<GraphAppearance, 'labelMutedForeground'>,
): string {
  return node.metadata?.gitIgnored === true
    ? mixHexColors(nodeColor, appearance.labelMutedForeground, 0.72)
    : nodeColor;
}

function createGraphNodePositionState(
  node: IGraphNode,
  previous: PreviousNodeState | undefined,
): GraphNodePositionState {
  const runtimePosition = node as RuntimeGraphNodePositionState;
  const z = (node as { z?: unknown }).z;
  return {
    fx: readPositionNumber(runtimePosition.fx, previous?.fx),
    fy: readPositionNumber(runtimePosition.fy, previous?.fy),
    fz: readPositionNumber(runtimePosition.fz, previous?.fz),
    vx: readPositionNumber(runtimePosition.vx, previous?.vx),
    vy: readPositionNumber(runtimePosition.vy, previous?.vy),
    vz: readPositionNumber(runtimePosition.vz, previous?.vz),
    x: node.x ?? previous?.x,
    y: node.y ?? previous?.y,
    z: typeof z === 'number' ? z : previous?.z,
  };
}

function readPositionNumber(value: unknown, fallback: number | undefined): number | undefined {
  return readFiniteNumber(value) ?? fallback;
}

function createGraphNode(
  node: IGraphNode,
  options: {
    appearance: GraphAppearance;
    favorites: ReadonlySet<string>;
    nodeSizes: ReadonlyMap<string, number>;
  },
  isLight: boolean,
  previousNodeStates: ReadonlyMap<string, PreviousNodeState>,
): FGNode {
  const runtimeNode = node as IGraphNode & RuntimeGraphNodePresentation;
  const previous = previousNodeStates.get(node.id);
  const style = createGraphNodeStyle(node, options, isLight);
  const position = createGraphNodePositionState(node, previous);

  return {
    ...runtimeNode,
    id: node.id,
    label: node.label,
    ...style,
    isPinned: runtimeNode.isPinned === true,
    nodeType: node.nodeType,
    ownerPluginId: runtimeNode.ownerPluginId,
    runtimeNodeType: runtimeNode.runtimeNodeType,
    shape2D: node.shape2D,
    shape3D: node.shape3D,
    imageUrl: node.imageUrl,
    metadata: node.metadata,
    isCollapsible: node.isCollapsible,
    isCollapsed: node.isCollapsed,
    collapsedDescendantCount: node.collapsedDescendantCount,
    ...position,
  } as FGNode;
}

export function buildGraphNodes(options: BuildGraphNodesOptions): FGNode[] {
  const {
    nodes,
    edges,
    appearance = DEFAULT_GRAPH_APPEARANCE,
    nodeSizes,
    theme,
    favorites,
    timelineActive,
    previousNodes = [],
    random = Math.random,
  } = options;
  const isLight = theme === 'light';
  const previousNodeStates = createPreviousNodeStateMap(previousNodes);
  const graphNodes = nodes.map(node => createGraphNode(
    node,
    { appearance, nodeSizes, favorites },
    isLight,
    previousNodeStates,
  ));

  seedTimelinePositions(graphNodes, edges, timelineActive ? previousNodeStates : null, random);

  return graphNodes;
}
