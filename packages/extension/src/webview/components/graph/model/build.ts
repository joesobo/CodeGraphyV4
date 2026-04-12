import type { LinkObject, NodeObject } from 'react-force-graph-2d';
import type { IGraphData } from '../../../../shared/graph/types';
import type { BidirectionalEdgeMode, NodeShape2D, NodeShape3D, NodeSizeMode } from '../../../../shared/settings/modes';
import type { ThemeKind } from '../../../theme/useTheme';
import { buildGraphLinks } from './link/build';
import { buildGraphNodes } from './node/build';
export { processEdges } from './edgeProcessing';
import { calculateNodeSizes } from './node/sizing';
export { DEFAULT_NODE_SIZE, FAVORITE_BORDER_COLOR, getDepthOpacity, getDepthSizeMultiplier, getNodeType, resolveDirectionColor } from './node/display';
export { calculateNodeSizes, toD3Repel } from './node/sizing';

export type FGNode = NodeObject & {
  id: string;
  label: string;
  size: number;
  color: string;
  borderColor: string;
  borderWidth: number;
  baseOpacity: number;
  isFavorite: boolean;
  shape2D?: NodeShape2D;
  shape3D?: NodeShape3D;
  imageUrl?: string;
};

export type FGLink = LinkObject & {
  id: string;
  from: string;
  to: string;
  source: string | FGNode;
  target: string | FGNode;
  bidirectional: boolean;
  baseColor?: string;
  curvature?: number;
  curvatureGroupId?: string;
};

export interface BuildGraphDataOptions {
  data: IGraphData;
  nodeSizeMode: NodeSizeMode;
  theme: ThemeKind;
  favorites: Set<string>;
  bidirectionalMode: BidirectionalEdgeMode;
  timelineActive: boolean;
  previousNodes?: Array<Pick<FGNode, 'id' | 'x' | 'y'>>;
  random?: () => number;
}

export function buildGraphData(options: BuildGraphDataOptions): { nodes: FGNode[]; links: FGLink[] } {
  const nodeSizes = calculateNodeSizes(options.data.nodes, options.data.edges, options.nodeSizeMode);
  const nodes = buildGraphNodes({
    nodes: options.data.nodes,
    edges: options.data.edges,
    nodeSizes,
    theme: options.theme,
    favorites: options.favorites,
    timelineActive: options.timelineActive,
    previousNodes: options.previousNodes,
    random: options.random,
  });
  const links = buildGraphLinks(options.data.edges, options.bidirectionalMode);

  return { nodes, links };
}
