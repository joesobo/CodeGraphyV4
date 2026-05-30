import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { IProjectedConnection } from './projectedConnection';
import {
  getRelationshipEvidenceSpecifier,
  materializeRelationshipTargetPath,
} from './relationshipEvidence';

export function projectProjectedConnectionsFromFileAnalysis(
  analysis: IFileAnalysisResult,
  workspaceRoot: string,
): IProjectedConnection[] {
  return (analysis.relations ?? []).map(evidence => ({
    kind: evidence.edgeType,
    pluginId: evidence.pluginId,
    sourceId: evidence.sourceId,
    specifier: getRelationshipEvidenceSpecifier(evidence),
    resolvedPath: materializeRelationshipTargetPath(evidence.target, workspaceRoot),
    type: evidence.timing,
    variant: evidence.variant,
    metadata: evidence.metadata,
  }));
}

export function projectConnectionMapFromFileAnalysis(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
  workspaceRoot: string,
): Map<string, IProjectedConnection[]> {
  return new Map(
    Array.from(fileAnalysis.entries()).map(([filePath, analysis]) => [
      filePath,
      projectProjectedConnectionsFromFileAnalysis(analysis, workspaceRoot),
    ]),
  );
}
