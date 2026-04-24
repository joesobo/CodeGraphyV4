import type { GraphEdgeKind, IAnalysisRelation, IAnalysisSymbol } from '@codegraphy-vscode/plugin-api';

export type ImpactDirection = 'incoming' | 'outgoing' | 'both';

export interface QueryOptions {
  direction?: ImpactDirection;
  kinds?: GraphEdgeKind[];
  maxDepth?: number;
  maxResults?: number;
}

export interface QueryNode {
  id: string;
  kind: 'file' | 'symbol';
  label: string;
  filePath?: string;
  symbolKind?: string;
}

export interface QueryEdge {
  from: string;
  to: string;
  kind: string;
  supportCount: number;
}

export interface QuerySymbol {
  id: string;
  name: string;
  kind: string;
  filePath: string;
  signature?: string;
}

export interface QueryResult {
  [key: string]: unknown;
  repo: string;
  nodes: QueryNode[];
  edges: QueryEdge[];
  symbols: QuerySymbol[];
  summary: Record<string, unknown>;
  limitations: string[];
}

export interface ExplainRelationshipInput extends QueryOptions {
  from: string;
  to: string;
}

export interface QueryContext {
  repo: string;
  files: Set<string>;
  symbols: Map<string, IAnalysisSymbol>;
  symbolsByFile: Map<string, IAnalysisSymbol[]>;
  relations: IAnalysisRelation[];
  outgoingFileRelations: Map<string, IAnalysisRelation[]>;
  incomingFileRelations: Map<string, IAnalysisRelation[]>;
  outgoingSymbolRelations: Map<string, IAnalysisRelation[]>;
  incomingSymbolRelations: Map<string, IAnalysisRelation[]>;
  hybridOutgoing: Map<string, IAnalysisRelation[]>;
  hybridIncoming: Map<string, IAnalysisRelation[]>;
}
