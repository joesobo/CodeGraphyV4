import type {
  GraphEdgeKind,
  NodeType,
} from '../graph/contracts';

export interface IGraphNodeTypeDefinition {
  id: NodeType;
  label: string;
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
