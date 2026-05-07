import type { IGraphEdge, IGraphNode } from '../../../../../shared/graph/contracts';
import {
  createDefaultGraphLayoutSettings,
  getGraphLayoutPinCoordinate,
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
  const rawColor = isLight ? adjustColorForLightTheme(node.color) : node.color;
  const isFavorite = options.favorites.has(node.id);
  const isFocused = node.depthLevel === 0;
  const size = (options.nodeSizes.get(node.id) ?? DEFAULT_NODE_SIZE) * getDepthSizeMultiplier(node.depthLevel);
  const previous = previousNodeStates.get(node.id);
  const pinCoordinate = options.timelineActive
    ? undefined
    : getGraphLayoutPinCoordinate(options.graphLayout.pinnedNodes[node.id], options.graphMode);
  const x = pinCoordinate?.x ?? node.x ?? previous?.x;
  const y = pinCoordinate?.y ?? node.y ?? previous?.y;
  const z = options.graphMode === '3d' && pinCoordinate && 'z' in pinCoordinate
    ? pinCoordinate.z
    : previous?.z;
  const ownerSectionId = options.timelineActive
    ? null
    : (options.graphLayout.ownership[node.id]?.ownerSectionId ?? null);

  return {
    id: node.id,
    label: node.label,
    size,
    color: rawColor,
    borderColor: getNodeBorderColor(isFocused, isFavorite, options.appearance, rawColor),
    borderWidth: getNodeBorderWidth(isFocused, isFavorite),
    baseOpacity: getDepthOpacity(node.depthLevel),
    isFavorite,
    isPinned: !!pinCoordinate,
    nodeType: node.nodeType,
    shape2D: node.shape2D,
    shape3D: node.shape3D,
    imageUrl: node.imageUrl,
    ownerSectionId,
    fx: pinCoordinate?.x,
    fy: pinCoordinate?.y,
    fz: options.graphMode === '3d' && pinCoordinate && 'z' in pinCoordinate
      ? pinCoordinate.z
      : undefined,
    vx: previous?.vx,
    vy: previous?.vy,
    vz: previous?.vz,
    x,
    y,
    z,
  } as FGNode;
}

function getSectionNodeSize(section: Pick<GraphLayoutSection, 'height' | 'width'>): number {
  return Math.max(24, Math.min(48, Math.sqrt(section.width * section.height) / 12));
}

function createGraphSectionNode(
  section: GraphLayoutSection,
  options: {
    graphLayout: GraphLayoutSettings;
  },
  previousNodeStates: ReadonlyMap<string, PreviousNodeState>,
): FGNode {
  const previous = previousNodeStates.get(section.id);
  const pinCoordinate = getGraphLayoutPinCoordinate(options.graphLayout.pinnedNodes[section.id], '2d');
  const x = pinCoordinate?.x ?? section.x ?? previous?.x;
  const y = pinCoordinate?.y ?? section.y ?? previous?.y;

  return {
    id: section.id,
    label: section.label,
    size: getSectionNodeSize(section),
    color: section.color,
    borderColor: section.color,
    borderWidth: 2,
    baseOpacity: 0.35,
    isFavorite: false,
    isGraphSection: true,
    isPinned: !!pinCoordinate,
    nodeType: 'graph-section',
    ownerSectionId: options.graphLayout.ownership[section.id]?.ownerSectionId ?? null,
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
  graphLayout: GraphLayoutSettings,
  graphMode: GraphLayoutMode,
  timelineActive: boolean,
  previousNodeStates: ReadonlyMap<string, PreviousNodeState>,
): FGNode[] {
  if (graphMode !== '2d' || timelineActive) {
    return [];
  }

  return Object.values(graphLayout.sections)
    .map(section => createGraphSectionNode(section, { graphLayout }, previousNodeStates));
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
  graphNodes.push(...buildGraphSectionNodes(
    graphLayout,
    graphMode,
    timelineActive,
    previousNodeStates,
  ));

  seedTimelinePositions(graphNodes, edges, timelineActive ? previousNodeStates : null, random);

  return graphNodes;
}
