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

export interface IAnalysisRelationshipFileEndpoint {
  kind: 'file';
  filePath?: string;
}

export interface IAnalysisRelationshipNodeEndpoint {
  kind: 'node';
  nodeId: string;
}

export interface IAnalysisRelationshipSymbolEndpoint {
  kind: 'symbol';
  symbolId: string;
  filePath?: string;
}

export type IAnalysisRelationshipEndpoint =
  | IAnalysisRelationshipFileEndpoint
  | IAnalysisRelationshipNodeEndpoint
  | IAnalysisRelationshipSymbolEndpoint;

export interface IAnalysisRelationshipFileTarget {
  kind: 'file';
  path: string;
  pathKind?: 'absolute' | 'workspace-relative';
  specifier?: string;
}

export interface IAnalysisRelationshipNodeTarget {
  kind: 'node';
  nodeId: string;
  specifier?: string;
}

export interface IAnalysisRelationshipSymbolTarget {
  kind: 'symbol';
  symbolId: string;
  filePath?: string;
  specifier?: string;
}

export interface IAnalysisRelationshipExternalTarget {
  kind: 'external';
  specifier: string;
  packageName?: string;
}

export interface IAnalysisRelationshipUnresolvedTarget {
  kind: 'unresolved';
  specifier: string;
}

export type IAnalysisRelationshipTarget =
  | IAnalysisRelationshipFileTarget
  | IAnalysisRelationshipNodeTarget
  | IAnalysisRelationshipSymbolTarget
  | IAnalysisRelationshipExternalTarget
  | IAnalysisRelationshipUnresolvedTarget;

export interface IAnalysisRelationshipEvidence {
  edgeType: GraphEdgeKind;
  pluginId?: string;
  sourceId: string;
  from?: IAnalysisRelationshipEndpoint;
  target: IAnalysisRelationshipTarget;
  specifier?: string;
  timing?: string;
  variant?: string;
  metadata?: GraphMetadata;
}

export interface IFileAnalysisResult {
  filePath: string;
  nodeTypes?: IPluginNodeType[];
  edgeTypes?: IPluginEdgeType[];
  nodes?: IAnalysisNode[];
  symbols?: IAnalysisSymbol[];
  relations?: IAnalysisRelationshipEvidence[];
}
