import type {
  GraphEdgeKind,
  NodeType,
} from '../graph/contracts';

export interface IGraphNodeTypeDefinition {
  id: NodeType;
  label: string;
  defaultColor: string;
  defaultVisible: boolean;
  description?: IGraphTypeDescription;
  parentId?: NodeType;
  pluginName?: string;
  matchSymbolKinds?: string[];
  matchSymbolPluginKind?: string;
  matchSymbolSource?: string;
  matchSymbolLanguage?: string;
  matchSymbolFilePath?: string;
}

export interface IGraphEdgeTypeDefinition {
  id: GraphEdgeKind;
  label: string;
  defaultColor: string;
  defaultVisible: boolean;
  description?: IGraphTypeDescription;
}

export interface IGraphTypeExample {
  label?: string;
  code: string;
}

export interface IGraphTypeDescription {
  description: string;
  examples?: IGraphTypeExample[];
}

export interface IGraphControlsSnapshot {
  nodeTypes: IGraphNodeTypeDefinition[];
  edgeTypes: IGraphEdgeTypeDefinition[];
  nodeColors: Record<string, string>;
  nodeVisibility: Record<string, boolean>;
  edgeVisibility: Record<string, boolean>;
}
