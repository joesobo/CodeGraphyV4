export type OrganizeVerdict = 'SPLIT' | 'STABLE' | 'WARNING';
export type OrganizeDepthVerdict = 'DEEP' | 'STABLE' | 'WARNING';
export type OrganizeCohesionConfidence = 'imports-only' | 'prefix+imports' | 'prefix-only';

export interface OrganizeCohesionCluster {
  confidence: OrganizeCohesionConfidence;
  memberCount: number;
  members: string[];
  prefix: string;
  suggestedFolder: string;
}

export interface OrganizeFileIssue {
  detail: string;
  fileName: string;
  kind: 'barrel' | 'low-info-banned' | 'low-info-discouraged' | 'redundancy';
  redundancyScore?: number;
}

export interface OrganizeComparison {
  fileFanOutDelta: number;
  folderFanOutDelta: number;
  clusterCountDelta: number;
  issueCountDelta: number;
  redundancyDelta: number;
  verdict: 'improved' | 'mixed' | 'unchanged' | 'worse';
}

export interface OrganizeDirectoryMetric {
  averageRedundancy: number;
  clusters: OrganizeCohesionCluster[];
  comparison?: OrganizeComparison;
  depth: number;
  depthVerdict: OrganizeDepthVerdict;
  directoryPath: string;
  fileIssues: OrganizeFileIssue[];
  fileFanOut: number;
  fileFanOutVerdict: OrganizeVerdict;
  folderFanOut: number;
  folderFanOutVerdict: OrganizeVerdict;
}
