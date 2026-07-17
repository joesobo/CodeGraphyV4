import type { IAnalysisRelation, IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { IGraphEdge } from './contracts';
import { createGraphEdgeId } from './edgeIdentity';
import { createCanonicalSymbolIds } from './symbolIds';
import { toRepoRelativeGraphPath } from './symbolPaths';

export function hasSymbolEndpoint(relation: IAnalysisRelation): boolean {
  return Boolean(relation.fromSymbolId || relation.toSymbolId);
}

function createRelationEdgeSource(relation: IAnalysisRelation): IGraphEdge['sources'][number] | undefined {
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
  relation: IAnalysisRelation,
  symbolIds: ReadonlyMap<string, string>,
  workspaceRoot: string,
): string {
  return relation.fromSymbolId
    ? symbolIds.get(relation.fromSymbolId)
      ?? toRepoRelativeGraphPath(relation.fromFilePath, workspaceRoot)
    : toRepoRelativeGraphPath(relation.fromFilePath, workspaceRoot);
}

function resolveRelationTargetId(
  relation: IAnalysisRelation,
  symbolIds: ReadonlyMap<string, string>,
  workspaceRoot: string,
): string | undefined {
  if (relation.toSymbolId) {
    const symbolId = symbolIds.get(relation.toSymbolId);
    if (symbolId) {
      return symbolId;
    }
  }

  const targetPath = relation.toFilePath ?? relation.resolvedPath;
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

      const from = resolveRelationSourceId(relation, symbolIds, workspaceRoot);
      const to = resolveRelationTargetId(relation, symbolIds, workspaceRoot);
      if (!to) {
        continue;
      }

      const source = createRelationEdgeSource(relation);
      edges.push({
        id: createGraphEdgeId({
          from,
          to,
          kind: relation.kind,
          type: relation.type,
          variant: relation.variant,
        }),
        from,
        to,
        kind: relation.kind,
        sources: source ? [source] : [],
      });
    }
  }

  return edges;
}
