import type { NodeShape2D, NodeShape3D } from '../settings/modes';

export type NodeType = 'file' | 'folder';

export interface IGraphNode {
  id: string;
  label: string;
  color: string;
  x?: number;
  favorite?: boolean;
  y?: number;
  fileSize?: number;
  accessCount?: number;
  depthLevel?: number;
  nodeType?: NodeType;
  shape2D?: NodeShape2D;
  shape3D?: NodeShape3D;
  imageUrl?: string;
}

export interface IGraphEdge {
  id: string;
  from: string;
  to: string;
  ruleId?: string;
  ruleIds?: string[];
}

export interface IGraphData {
  nodes: IGraphNode[];
  edges: IGraphEdge[];
}
