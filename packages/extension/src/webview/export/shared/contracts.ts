export interface ExportBuildContext {
  timelineActive?: boolean;
  currentCommitSha?: string | null;
}

export interface ExportLegendRule {
  id: string;
  pattern: string;
  color: string;
  target: 'node' | 'edge' | 'both';
  shape2D?: string;
  shape3D?: string;
  imagePath?: string;
  imageUrl?: string;
  disabled?: boolean;
  isPluginDefault?: boolean;
  pluginName?: string;
}

export interface ExportNodeEntry {
  id: string;
  label: string;
  nodeType: string;
  color: string;
  legendIds: string[];
  fileSize?: number;
  accessCount?: number;
  x?: number;
  y?: number;
}

export interface ExportEdgeSourceEntry {
  id: string;
  pluginId: string;
  pluginName?: string;
  sourceId: string;
  label: string;
  variant?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface ExportEdgeEntry {
  id: string;
  from: string;
  to: string;
  kind: string;
  color?: string;
  legendIds: string[];
  sources: ExportEdgeSourceEntry[];
}

export interface ExportData {
  format: 'codegraphy-export';
  version: '3.0';
  exportedAt: string;
  scope: {
    graph: 'current-view';
    timeline: {
      active: boolean;
      commitSha: string | null;
    };
  };
  summary: {
    totalNodes: number;
    totalEdges: number;
    totalLegendRules: number;
    totalImages: number;
  };
  legend: ExportLegendRule[];
  nodes: ExportNodeEntry[];
  edges: ExportEdgeEntry[];
}
