import type { LinkObject, NodeObject } from 'react-force-graph-2d';
import {
  type BidirectionalEdgeMode,
  type IGraphData,
  type NodeShape2D,
  type NodeShape3D,
  type NodeSizeMode,
} from '../../../shared/types';
import type { ThemeKind } from '../../useTheme';

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
  bidirectional: boolean;
  baseColor?: string;
  curvature?: number;
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

export type { ProcessedEdge } from './edgeProcessing';
export { buildGraphData } from './buildGraphData';
export { processEdges } from './edgeProcessing';
export {
  DEFAULT_NODE_SIZE,
  FAVORITE_BORDER_COLOR,
  getDepthOpacity,
  getDepthSizeMultiplier,
  getNodeType,
  resolveDirectionColor,
} from './nodeDisplay';
export { calculateNodeSizes, toD3Repel } from './nodeSizing';
