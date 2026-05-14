import type {
  GraphEdgeKind,
  NodeType,
} from '../graph/contracts';

export interface IGraphNodeTypeDefinition {
  id: NodeType;
  label: string;
  defaultColor: string;
  defaultVisible: boolean;
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
}
