import type {
  GraphEdgeKind,
  NodeType,
} from '../graph/contracts';

export interface IGraphNodeTypeDefinition {
  id: NodeType;
  label: string;
  defaultColor: string;
  defaultVisible: boolean;
  colorEditable?: boolean;
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

export interface IGraphControlsSnapshot {
  nodeTypes: IGraphNodeTypeDefinition[];
  edgeTypes: IGraphEdgeTypeDefinition[];
  nodeColors: Record<string, string>;
  nodeColorEnabled: Record<string, boolean>;
  nodeVisibility: Record<string, boolean>;
  edgeVisibility: Record<string, boolean>;
}
