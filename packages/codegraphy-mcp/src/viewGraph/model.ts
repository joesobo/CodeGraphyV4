import type { GraphEdgeKind } from '@codegraphy-vscode/plugin-api';

export interface ViewGraphOptions {
  kinds?: GraphEdgeKind[];
  maxResults?: number;
  focus?: string;
  depthMode?: boolean;
  depthLimit?: number;
  includeFolders?: boolean;
  includePackages?: boolean;
  showOrphans?: boolean;
}

export interface ViewGraphNode {
  id: string;
  label: string;
  nodeType: 'file' | 'folder' | 'package';
  depthLevel?: number;
}

export interface ViewGraphEdge {
  id: string;
  from: string;
  to: string;
  kind: string;
  supportCount: number;
  structural: boolean;
}

export interface ViewGraphResult {
  [key: string]: unknown;
  repo: string;
  nodes: ViewGraphNode[];
  edges: ViewGraphEdge[];
  summary: {
    focus?: string;
    depthMode: boolean;
    depthLimit?: number;
    includeFolders: boolean;
    includePackages: boolean;
    showOrphans: boolean;
    nodeCount: number;
    edgeCount: number;
    nodeTypeCounts: Record<string, number>;
    edgeKindCounts: Record<string, number>;
  };
  limitations: string[];
}

export interface ViewGraphSettings {
  depthMode: boolean;
  depthLimit: number;
  includeFolders: boolean;
  includePackages: boolean;
  showOrphans: boolean;
}
