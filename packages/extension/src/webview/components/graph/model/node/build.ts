import type { IGraphEdge, IGraphNode } from '../../../../../shared/graph/contracts';
import {
  createDefaultGraphLayoutSettings,
  getGraphLayoutPinCoordinate,
  type GraphLayoutCoordinate2D,
  type GraphLayoutCoordinate3D,
  type GraphLayoutMode,
  type GraphLayoutSection,
  type GraphLayoutSettings,
} from '../../../../../shared/settings/graphLayout';
import type { ThemeKind } from '../../../../theme/useTheme';
import { adjustColorForLightTheme } from '../../../../theme/useTheme';
import { DEFAULT_GRAPH_APPEARANCE, type GraphAppearance } from '../../appearance/model';
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
  appearance?: GraphAppearance;
  nodeSizes: Map<string, number>;
  theme: ThemeKind;
  favorites: Set<string>;
  graphLayout?: GraphLayoutSettings;
  graphMode?: GraphLayoutMode;
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
  appearance: Pick<GraphAppearance, 'focusBorder'>,
  rawColor: string,
): string {
  if (isFocused) {
    return appearance.focusBorder;
  }

  return isFavorite ? FAVORITE_BORDER_COLOR : rawColor;
}

function getNodeBorderWidth(isFocused: boolean, isFavorite: boolean): number {
  if (isFocused) {
    return 4;
  }

  return isFavorite ? 3 : 2;
}

type GraphNodePinCoordinate = GraphLayoutCoordinate2D | GraphLayoutCoordinate3D;

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

interface RuntimeGraphNodePresentation {
  hiddenDescendantCount?: number;
  icon?: string;
  isCollapsedGraphSection?: boolean;
  isGraphSection?: boolean;
  ownerPluginId?: string;
  ownerSectionId?: string | null;
  runtimeNodeType?: string;
  sectionHeight?: number;
  sectionWidth?: number;
  size?: number;
}

function getActiveGraphNodePinCoordinate(
  nodeId: string,
  options: {
    graphLayout: GraphLayoutSettings;
    graphMode: GraphLayoutMode;
    timelineActive: boolean;
  },
): GraphNodePinCoordinate | undefined {
  return options.timelineActive
    ? undefined
    : getGraphLayoutPinCoordinate(options.graphLayout.pinnedNodes[nodeId], options.graphMode);
}

function read3DCoordinate(
  coordinate: GraphNodePinCoordinate | undefined,
): GraphLayoutCoordinate3D | undefined {
  return coordinate && 'z' in coordinate ? coordinate : undefined;
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
  const isFavorite = options.favorites.has(node.id);
  const isFocused = node.depthLevel === 0;
  const runtimePresentation = node as IGraphNode & RuntimeGraphNodePresentation;
  const size = typeof runtimePresentation.size === 'number'
    ? runtimePresentation.size
    : (options.nodeSizes.get(node.id) ?? DEFAULT_NODE_SIZE) * getDepthSizeMultiplier(node.depthLevel);

  return {
    baseOpacity: getDepthOpacity(node.depthLevel),
    borderColor: getNodeBorderColor(isFocused, isFavorite, options.appearance, rawColor),
    borderWidth: getNodeBorderWidth(isFocused, isFavorite),
    color: rawColor,
    isFavorite,
    size,
  };
}

function createGraphNodePositionState(
  node: IGraphNode,
  previous: PreviousNodeState | undefined,
  pinCoordinate: GraphNodePinCoordinate | undefined,
  graphMode: GraphLayoutMode,
): GraphNodePositionState {
  const pinCoordinate3D = graphMode === '3d' ? read3DCoordinate(pinCoordinate) : undefined;

  return {
    fx: pinCoordinate?.x,
    fy: pinCoordinate?.y,
    fz: pinCoordinate3D?.z,
    vx: previous?.vx,
    vy: previous?.vy,
    vz: previous?.vz,
    x: pinCoordinate?.x ?? node.x ?? previous?.x,
    y: pinCoordinate?.y ?? node.y ?? previous?.y,
    z: pinCoordinate3D?.z ?? previous?.z,
  };
}

function getGraphNodeOwnerSectionId(
  nodeId: string,
  graphLayout: GraphLayoutSettings,
  timelineActive: boolean,
): string | null {
  return timelineActive ? null : (graphLayout.ownership[nodeId]?.ownerSectionId ?? null);
}

function resolveGraphNodePinCoordinate(
  pinCoordinate: GraphNodePinCoordinate | undefined,
  ownerSectionId: string | null,
  options: {
    graphLayout: GraphLayoutSettings;
    graphMode: GraphLayoutMode;
  },
): GraphNodePinCoordinate | undefined {
  if (!pinCoordinate || options.graphMode !== '2d' || !ownerSectionId) {
    return pinCoordinate;
  }

  const ownerSection = options.graphLayout.sections[ownerSectionId];
  if (!ownerSection) {
    return pinCoordinate;
  }

  const ownerTopLeft = getSectionWorldTopLeft(ownerSection, options.graphLayout);
  return {
    x: ownerTopLeft.x + pinCoordinate.x,
    y: ownerTopLeft.y + pinCoordinate.y,
  };
}

function createGraphNode(
  node: IGraphNode,
  options: {
    appearance: GraphAppearance;
    favorites: ReadonlySet<string>;
    graphLayout: GraphLayoutSettings;
    graphMode: GraphLayoutMode;
    nodeSizes: ReadonlyMap<string, number>;
    timelineActive: boolean;
  },
  isLight: boolean,
  previousNodeStates: ReadonlyMap<string, PreviousNodeState>,
): FGNode {
  const runtimeNode = node as IGraphNode & RuntimeGraphNodePresentation;
  const previous = previousNodeStates.get(node.id);
  const ownerSectionId = getGraphNodeOwnerSectionId(node.id, options.graphLayout, options.timelineActive);
  const resolvedOwnerSectionId = runtimeNode.ownerSectionId !== undefined
    ? runtimeNode.ownerSectionId
    : ownerSectionId;
  const pinCoordinate = resolveGraphNodePinCoordinate(
    getActiveGraphNodePinCoordinate(node.id, options),
    resolvedOwnerSectionId,
    options,
  );
  const style = createGraphNodeStyle(node, options, isLight);
  const position = createGraphNodePositionState(node, previous, pinCoordinate, options.graphMode);

  return {
    id: node.id,
    label: node.label,
    ...style,
    isPinned: !!pinCoordinate,
    nodeType: node.nodeType,
    ownerPluginId: runtimeNode.ownerPluginId,
    runtimeNodeType: runtimeNode.runtimeNodeType,
    shape2D: node.shape2D,
    shape3D: node.shape3D,
    imageUrl: node.imageUrl,
    metadata: node.metadata,
    isCollapsible: node.isCollapsible,
    isCollapsed: node.isCollapsed,
    hiddenDescendantCount: runtimeNode.hiddenDescendantCount,
    icon: runtimeNode.icon,
    isCollapsedGraphSection: runtimeNode.isCollapsedGraphSection,
    isGraphSection: runtimeNode.isGraphSection,
    collapsedDescendantCount: node.collapsedDescendantCount,
    ownerSectionId: resolvedOwnerSectionId,
    sectionHeight: runtimeNode.sectionHeight,
    sectionWidth: runtimeNode.sectionWidth,
    ...position,
  } as FGNode;
}

function getSectionWorldTopLeft(
  section: GraphLayoutSection,
  graphLayout: GraphLayoutSettings,
  visited = new Set<string>(),
): GraphLayoutCoordinate2D {
  if (visited.has(section.id)) {
    return { x: section.x, y: section.y };
  }

  const ownerSectionId = graphLayout.ownership[section.id]?.ownerSectionId ?? null;
  const ownerSection = ownerSectionId ? graphLayout.sections[ownerSectionId] : undefined;
  if (!ownerSection) {
    return { x: section.x, y: section.y };
  }

  visited.add(section.id);
  const ownerTopLeft = getSectionWorldTopLeft(ownerSection, graphLayout, visited);
  return {
    x: ownerTopLeft.x + section.x,
    y: ownerTopLeft.y + section.y,
  };
}

export function buildGraphNodes(options: BuildGraphNodesOptions): FGNode[] {
  const {
    nodes,
    edges,
    appearance = DEFAULT_GRAPH_APPEARANCE,
    nodeSizes,
    theme,
    favorites,
    graphLayout = createDefaultGraphLayoutSettings(),
    graphMode = '2d',
    timelineActive,
    previousNodes = [],
    random = Math.random,
  } = options;
  const isLight = theme === 'light';
  const previousNodeStates = createPreviousNodeStateMap(previousNodes);
  const graphNodes = nodes.map(node => createGraphNode(
    node,
    { appearance, nodeSizes, favorites, graphLayout, graphMode, timelineActive },
    isLight,
    previousNodeStates,
  ));

  seedTimelinePositions(graphNodes, edges, timelineActive ? previousNodeStates : null, random);

  return graphNodes;
}
