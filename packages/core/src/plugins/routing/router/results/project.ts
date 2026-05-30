import type { IFileAnalysisResult, IPlugin } from '@codegraphy-dev/plugin-api';
import type { IProjectedConnection } from '../../../../analysis/projectedConnection';
import {
  getRelationshipEvidenceSpecifier,
  materializeRelationshipTargetPath,
} from '../../../../analysis/relationshipEvidence';

export function withPluginProvenance(
  plugin: IPlugin,
  result: IFileAnalysisResult,
): IFileAnalysisResult {
  return {
    ...result,
    relations: result.relations?.map((relation) => ({
      ...relation,
      pluginId: relation.pluginId ?? plugin.id,
    })),
  };
}

export function toProjectedConnectionsFromFileAnalysis(
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
