import type { GraphEdgeKind, GraphMetadata, NodeType } from './graph';

export interface IAnalysisRange {
  startLine: number;
  startColumn?: number;
  endLine: number;
  endColumn?: number;
}

export interface IPluginNodeType {
  id: NodeType;
  label: string;
  defaultColor: string;
  defaultVisible: boolean;
}

export interface IPluginEdgeType {
  id: GraphEdgeKind;
  label: string;
  defaultColor: string;
  defaultVisible: boolean;
}

export interface IAnalysisNode {
  id: string;
  nodeType: NodeType;
  label: string;
  filePath?: string;
  parentId?: string;
  metadata?: GraphMetadata;
}

export interface IAnalysisSymbol {
  id: string;
  name: string;
  kind: string;
  filePath: string;
  signature?: string;
  range?: IAnalysisRange;
  metadata?: GraphMetadata;
}

export interface IAnalysisRelation {
  kind: GraphEdgeKind;
  pluginId?: string;
  sourceId: string;
  fromFilePath: string;
  toFilePath?: string | null;
  fromNodeId?: string;
  toNodeId?: string;
  fromSymbolId?: string;
  toSymbolId?: string;
  specifier?: string;
  type?: string;
  variant?: string;
  resolvedPath?: string | null;
  metadata?: GraphMetadata;
}

export interface IFileAnalysisResult {
  filePath: string;
  nodeTypes?: IPluginNodeType[];
  edgeTypes?: IPluginEdgeType[];
  nodes?: IAnalysisNode[];
  symbols?: IAnalysisSymbol[];
  relations?: IAnalysisRelation[];
}
