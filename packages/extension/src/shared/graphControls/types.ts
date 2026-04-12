import type {
  GraphEdgeKind,
  NodeType,
} from '../graph/types';

export interface IGraphNodeTypeDefinition {
  id: NodeType;
  label: string;
  defaultColor: string;
  defaultVisible: boolean;
}

export interface IGraphEdgeTypeDefinition {
  id: GraphEdgeKind;
  label: string;
  defaultColor: string;
  defaultVisible: boolean;
}

export interface IGraphControlsSnapshot {
  nodeTypes: IGraphNodeTypeDefinition[];
  edgeTypes: IGraphEdgeTypeDefinition[];
  nodeColors: Record<string, string>;
  nodeVisibility: Record<string, boolean>;
  edgeVisibility: Record<string, boolean>;
  edgeColors: Record<string, string>;
}
