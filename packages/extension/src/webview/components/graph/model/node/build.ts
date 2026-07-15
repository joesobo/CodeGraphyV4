import type { IGraphNode } from '../../../../../shared/graph/contracts';
import type { ThemeKind } from '../../../../theme/useTheme';
import { adjustColorForLightTheme } from '../../../../theme/useTheme';
import { DEFAULT_GRAPH_APPEARANCE, type GraphAppearance } from '../../appearance/model';
import type { FGNode } from '../build';
import { MAX_NODE_SIZE, MIN_NODE_SIZE } from '../sizing/calculations';
import {
  graphNodeBorderColor,
  graphNodeBorderWidth,
  graphNodeDisplayColor,
} from './appearance';
import {
  DEFAULT_NODE_SIZE,
  getDepthOpacity,
  getDepthSizeMultiplier,
} from './display';
export interface BuildGraphNodesOptions {
  nodes: IGraphNode[];
  appearance?: GraphAppearance;
  nodeSizes: Map<string, number>;
  theme: ThemeKind;
  favorites: Set<string>;
  previousNodes?: Array<Pick<FGNode, 'id' | 'fx' | 'fy' | 'vx' | 'vy' | 'x' | 'y'>>;
}

interface PreviousNodeState {
  fx: number | undefined;
  fy: number | undefined;
  vx: number | undefined;
  vy: number | undefined;
  x: number | undefined;
  y: number | undefined;
}

function createPreviousNodeStateMap(
  previousNodes: Array<Pick<FGNode, 'id' | 'fx' | 'fy' | 'vx' | 'vy' | 'x' | 'y'>>,
): Map<string, PreviousNodeState> {
  return new Map(previousNodes.map(node => [node.id, {
    fx: node.fx,
    fy: node.fy,
    vx: node.vx,
    vy: node.vy,
    x: node.x,
    y: node.y,
  }]));
}

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
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
  vx: number | undefined;
  vy: number | undefined;
  x: number | undefined;
  y: number | undefined;
}

interface RuntimeGraphNodePositionState {
  fx?: unknown;
  fy?: unknown;
  vx?: unknown;
  vy?: unknown;
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
  const displayColor = graphNodeDisplayColor(node, rawColor, options.appearance);
  const isFavorite = options.favorites.has(node.id);
  const isFocused = node.depthLevel === 0;
  const runtimePresentation = node as IGraphNode & RuntimeGraphNodePresentation;
  const semanticSize = (options.nodeSizes.get(node.id) ?? DEFAULT_NODE_SIZE)
    * getDepthSizeMultiplier(node.depthLevel);
  const size = typeof runtimePresentation.size === 'number'
    ? runtimePresentation.size
    : Math.min(MAX_NODE_SIZE, Math.max(MIN_NODE_SIZE, semanticSize));

  return {
    baseOpacity: getNodeBaseOpacity(node),
    borderColor: graphNodeBorderColor({
      appearance: options.appearance,
      isFavorite,
      isFocused,
      nodeColor: displayColor,
    }),
    borderWidth: graphNodeBorderWidth(isFocused, isFavorite),
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

function createGraphNodePositionState(
  node: IGraphNode,
  previous: PreviousNodeState | undefined,
): GraphNodePositionState {
  const runtimePosition = node as RuntimeGraphNodePositionState;
  return {
    fx: readPositionNumber(runtimePosition.fx, previous?.fx),
    fy: readPositionNumber(runtimePosition.fy, previous?.fy),
    vx: readPositionNumber(runtimePosition.vx, previous?.vx),
    vy: readPositionNumber(runtimePosition.vy, previous?.vy),
    x: node.x ?? previous?.x,
    y: node.y ?? previous?.y,
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
    appearance = DEFAULT_GRAPH_APPEARANCE,
    nodeSizes,
    theme,
    favorites,
    previousNodes = [],
  } = options;
  const isLight = theme === 'light';
  const previousNodeStates = createPreviousNodeStateMap(previousNodes);
  return nodes.map(node => createGraphNode(
    node,
    { appearance, nodeSizes, favorites },
    isLight,
    previousNodeStates,
  ));
}
