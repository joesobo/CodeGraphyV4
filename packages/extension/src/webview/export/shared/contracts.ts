export const UNATTRIBUTED_RULE_KEY = 'unattributed';

export interface ExportBuildContext {
  timelineActive?: boolean;
  currentCommitSha?: string | null;
}

export interface ExportFile {
  imports?: Record<string, string[]>;
}

export interface ExportRule {
  name: string;
  plugin: string;
  connections: number;
}

export interface ExportGroup {
  style: {
    color: string;
    shape2D?: string;
    shape3D?: string;
    image?: string;
  };
  files: Record<string, ExportFile>;
}

export interface ExportConnectionsSection {
  sources: Record<string, ExportRule>;
  groups: Record<string, ExportGroup>;
  ungrouped: Record<string, ExportFile>;
}

export interface ExportImagesSectionEntry {
  groups: string[];
}

export interface ExportData {
  format: 'codegraphy-export';
  version: '2.0';
  exportedAt: string;
  scope: {
    graph: 'current-view';
    timeline: {
      active: boolean;
      commitSha: string | null;
    };
  };
  summary: {
    totalFiles: number;
    totalConnections: number;
    totalRules: number;
    totalGroups: number;
    totalImages: number;
  };
  sections: {
    connections: ExportConnectionsSection;
    images: Record<string, ExportImagesSectionEntry>;
  };
}
