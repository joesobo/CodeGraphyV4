import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type { GraphMetadata, IGraphData } from '../../../../shared/graph/contracts';
import type { BidirectionalEdgeMode, NodeShape2D, NodeShape3D, NodeSizeMode } from '../../../../shared/settings/modes';
import type { ThemeKind } from '../../../theme/useTheme';
import { DEFAULT_GRAPH_APPEARANCE, type GraphAppearance } from '../appearance/model';
import type { NodeType } from '../../../../shared/graph/contracts';
import { buildGraphLinks } from './link/build';
import { buildGraphNodes } from './node/build';
import {
  applyGraphViewProjectionContributions,
  applyGraphViewRuntimeContributions,
} from './runtimeContributions';
export { processEdges } from './edgeProcessing';
import { calculateNodeSizes } from './node/sizing';
export {
  DEFAULT_NODE_SIZE,
  FALLBACK_MUTED_NODE_COLOR,
  FAVORITE_BORDER_COLOR,
  getDepthOpacity,
  getDepthSizeMultiplier,
  getNodeType,
  resolveDirectionColor,
} from './node/display';
export { calculateNodeSizes, toD3Repel } from './node/sizing';

export type FGNode = Record<string, unknown> & {
  id: string;
  label: string;
  size: number;
  color: string;
  borderColor: string;
  borderWidth: number;
  baseOpacity: number;
  isFavorite: boolean;
  isPinned: boolean;
  icon?: string;
  nodeType?: NodeType;
  ownerPluginId?: string;
  runtimeNodeType?: string;
  fillOpacity2D?: number;
  cornerRadius2D?: number;
  shapeSize2D?: {
    height: number;
    width: number;
  };
  chargeStrengthMultiplier2D?: number;
  collisionRadius2D?: number;
  pointerArea2D?: {
    height: number;
    width: number;
  };
  shape2D?: NodeShape2D;
  shape3D?: NodeShape3D;
  imageUrl?: string;
  metadata?: GraphMetadata;
  collapsedDescendantCount?: number;
  isCollapsible?: boolean;
  isCollapsed?: boolean;
  isDragging?: boolean;
  fx?: number;
  fy?: number;
  vx?: number;
  vy?: number;
  x?: number;
  y?: number;
};

export type FGLink = Record<string, unknown> & {
  id: string;
  from: string;
  to: string;
  source: string | FGNode;
  target: string | FGNode;
  bidirectional: boolean;
  baseColor?: string;
  curvature?: number;
  curvatureGroupId?: string;
  kind?: string;
  metadata?: GraphMetadata;
  ownerPluginId?: string;
  projectedEdgeCount?: number;
  projectedEdgeIds?: string[];
  runtimeEdgeType?: string;
};

export interface BuildGraphDataOptions {
  data: IGraphData;
  graphViewContributions?: CoreGraphViewContributionSet;
  appearance?: GraphAppearance;
  nodeSizeMode: NodeSizeMode;
  theme: ThemeKind;
  favorites: Set<string>;
  graphMode?: '2d';
  bidirectionalMode: BidirectionalEdgeMode;
  previousNodes?: Array<Pick<FGNode, 'id' | 'fx' | 'fy' | 'vx' | 'vy' | 'x' | 'y'>>;
}

export function buildGraphData(options: BuildGraphDataOptions): { nodes: FGNode[]; links: FGLink[] } {
  const appearance = options.appearance ?? DEFAULT_GRAPH_APPEARANCE;
  const graphMode = options.graphMode ?? '2d';
  const runtimeData = applyGraphViewRuntimeContributions(
    options.data,
    options.graphViewContributions,
    { graphMode },
  );
  const projectedData = applyGraphViewProjectionContributions(
    runtimeData,
    options.graphViewContributions,
    { graphMode },
  );
  const nodeSizes = calculateNodeSizes(projectedData.nodes, projectedData.edges, options.nodeSizeMode);
  const nodes = buildGraphNodes({
    nodes: projectedData.nodes,
    appearance,
    nodeSizes,
    theme: options.theme,
    favorites: options.favorites,
    graphMode,
    previousNodes: options.previousNodes,
  });
  const links = buildGraphLinks(projectedData.edges, options.bidirectionalMode);

  return { nodes, links };
}
