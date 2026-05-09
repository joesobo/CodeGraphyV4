import type { IGraphEdge, IGraphNode } from '../../../../../shared/graph/contracts';
import {
  createDefaultGraphLayoutSettings,
  countGraphLayoutHiddenDescendants,
  getGraphLayoutPinCoordinate,
  type GraphLayoutCoordinate2D,
  type GraphLayoutCoordinate3D,
  isGraphLayoutSectionNodeVisible,
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
  allNodeIds?: readonly string[];
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
  const size = (options.nodeSizes.get(node.id) ?? DEFAULT_NODE_SIZE) * getDepthSizeMultiplier(node.depthLevel);

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
  const previous = previousNodeStates.get(node.id);
  const ownerSectionId = getGraphNodeOwnerSectionId(node.id, options.graphLayout, options.timelineActive);
  const pinCoordinate = resolveGraphNodePinCoordinate(
    getActiveGraphNodePinCoordinate(node.id, options),
    ownerSectionId,
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
    shape2D: node.shape2D,
    shape3D: node.shape3D,
    imageUrl: node.imageUrl,
    ownerSectionId,
    ...position,
  } as FGNode;
}

function getSectionNodeSize(section: Pick<GraphLayoutSection, 'height' | 'width'>): number {
  return Math.max(24, Math.min(48, Math.sqrt(section.width * section.height) / 12));
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

function createGraphSectionNode(
  section: GraphLayoutSection,
  options: {
    allNodeIds: readonly string[];
    graphLayout: GraphLayoutSettings;
  },
  previousNodeStates: ReadonlyMap<string, PreviousNodeState>,
): FGNode {
  const previous = previousNodeStates.get(section.id);
  const ownerSectionId = options.graphLayout.ownership[section.id]?.ownerSectionId ?? null;
  const rawPinCoordinate = getGraphLayoutPinCoordinate(options.graphLayout.pinnedNodes[section.id], '2d');
  const ownerSection = ownerSectionId ? options.graphLayout.sections[ownerSectionId] : undefined;
  const ownerTopLeft = ownerSection ? getSectionWorldTopLeft(ownerSection, options.graphLayout) : undefined;
  const pinCoordinate = rawPinCoordinate && ownerTopLeft
    ? { x: ownerTopLeft.x + rawPinCoordinate.x, y: ownerTopLeft.y + rawPinCoordinate.y }
    : rawPinCoordinate;
  const worldTopLeft = getSectionWorldTopLeft(section, options.graphLayout);
  const centerX = worldTopLeft.x + (section.width / 2);
  const centerY = worldTopLeft.y + (section.height / 2);
  const x = pinCoordinate?.x ?? previous?.x ?? centerX;
  const y = pinCoordinate?.y ?? previous?.y ?? centerY;

  return {
    id: section.id,
    label: section.label,
    icon: section.icon,
    size: getSectionNodeSize(section),
    color: section.color,
    borderColor: section.color,
    borderWidth: 2,
    baseOpacity: 0.35,
    hiddenDescendantCount: section.collapsed
      ? countGraphLayoutHiddenDescendants(options.graphLayout, section.id, options.allNodeIds)
      : 0,
    isCollapsedGraphSection: section.collapsed,
    isFavorite: false,
    isGraphSection: true,
    isPinned: !!pinCoordinate,
    nodeType: 'graph-section',
    ownerSectionId,
    sectionHeight: section.height,
    sectionWidth: section.width,
    shape2D: 'square',
    fx: pinCoordinate?.x,
    fy: pinCoordinate?.y,
    vx: previous?.vx,
    vy: previous?.vy,
    x,
    y,
  } as FGNode;
}

function buildGraphSectionNodes(
  allNodeIds: readonly string[],
  graphLayout: GraphLayoutSettings,
  graphMode: GraphLayoutMode,
  timelineActive: boolean,
  previousNodeStates: ReadonlyMap<string, PreviousNodeState>,
): FGNode[] {
  if (graphMode !== '2d' || timelineActive) {
    return [];
  }

  return Object.values(graphLayout.sections)
    .filter(section => isGraphLayoutSectionNodeVisible(graphLayout, section.id))
    .map(section => createGraphSectionNode(section, {
      allNodeIds,
      graphLayout,
    }, previousNodeStates));
}

export function buildGraphNodes(options: BuildGraphNodesOptions): FGNode[] {
  const {
    nodes,
    allNodeIds = nodes.map(node => node.id),
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
  graphNodes.push(...buildGraphSectionNodes(
    allNodeIds,
    graphLayout,
    graphMode,
    timelineActive,
    previousNodeStates,
  ));

  seedTimelinePositions(graphNodes, edges, timelineActive ? previousNodeStates : null, random);

  return graphNodes;
}
