import type { IAnalysisRelationshipEvidence, IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import {
  getRelationshipEvidenceSourceFilePath,
  getRelationshipEvidenceSourceSymbolId,
  getRelationshipEvidenceTargetSymbolId,
  materializeRelationshipTargetPath,
} from '../analysis/relationshipEvidence';
import type { IGraphEdge } from './contracts';
import { createGraphEdgeId } from './edgeIdentity';
import { createCanonicalSymbolIds } from './symbolIds';
import { toRepoRelativeGraphPath } from './symbolPaths';

export function hasSymbolEndpoint(relation: IAnalysisRelationshipEvidence): boolean {
  return Boolean(getRelationshipEvidenceSourceSymbolId(relation) || getRelationshipEvidenceTargetSymbolId(relation));
}

function createRelationEdgeSource(relation: IAnalysisRelationshipEvidence): IGraphEdge['sources'][number] | undefined {
  if (!relation.pluginId) {
    return undefined;
  }

  return {
    id: `${relation.pluginId}:${relation.sourceId}`,
    pluginId: relation.pluginId,
    sourceId: relation.sourceId,
    label: relation.sourceId,
    metadata: relation.metadata,
    variant: relation.variant,
  };
}

function resolveRelationSourceId(
  relation: IAnalysisRelationshipEvidence,
  analysisFilePath: string,
  symbolIds: ReadonlyMap<string, string>,
  workspaceRoot: string,
): string {
  const sourceSymbolId = getRelationshipEvidenceSourceSymbolId(relation);
  return sourceSymbolId
    ? symbolIds.get(sourceSymbolId) ?? sourceSymbolId
    : toRepoRelativeGraphPath(
      getRelationshipEvidenceSourceFilePath(relation, analysisFilePath),
      workspaceRoot,
    );
}

function resolveRelationTargetId(
  relation: IAnalysisRelationshipEvidence,
  symbolIds: ReadonlyMap<string, string>,
  workspaceRoot: string,
): string | undefined {
  const targetSymbolId = getRelationshipEvidenceTargetSymbolId(relation);
  if (targetSymbolId) {
    return symbolIds.get(targetSymbolId) ?? targetSymbolId;
  }

  const targetPath = materializeRelationshipTargetPath(relation.target, workspaceRoot);
  return targetPath ? toRepoRelativeGraphPath(targetPath, workspaceRoot) : undefined;
}

export function createSymbolRelationEdges(
  fileAnalysis: ReadonlyMap<string, IFileAnalysisResult>,
  workspaceRoot: string,
): IGraphEdge[] {
  const symbolIds = createCanonicalSymbolIds(fileAnalysis, workspaceRoot);
  const edges: IGraphEdge[] = [];

  for (const analysis of fileAnalysis.values()) {
    for (const relation of analysis.relations ?? []) {
      if (!hasSymbolEndpoint(relation)) {
        continue;
      }

      const from = resolveRelationSourceId(relation, analysis.filePath, symbolIds, workspaceRoot);
      const to = resolveRelationTargetId(relation, symbolIds, workspaceRoot);
      if (!to) {
        continue;
      }

      const source = createRelationEdgeSource(relation);
      edges.push({
        id: createGraphEdgeId({
          from,
          to,
          kind: relation.edgeType,
          type: relation.timing,
          variant: relation.variant,
        }),
        from,
        to,
        kind: relation.edgeType,
        sources: source ? [source] : [],
      });
    }
  }

  return edges;
}
