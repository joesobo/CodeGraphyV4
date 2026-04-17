import * as path from 'path';
import type { IFileAnalysisResult } from '../../core/plugins/types/contracts';
import type { IGraphEdge } from '../../shared/graph/contracts';
import { createGraphEdgeId } from '../../shared/graph/edgeIdentity';

export interface AppendGitHistoryAnalysisEdgesOptions {
  analysis: Pick<IFileAnalysisResult, 'relations'> | null;
  edgeSet: Set<string>;
  edges: IGraphEdge[];
  plugin?: { id: string };
  sourcePath: string;
  workspaceRoot: string;
}

export function appendGitHistoryAnalysisEdges(
  options: AppendGitHistoryAnalysisEdgesOptions,
): void {
  const {
    analysis,
    edgeSet,
    edges,
    plugin,
    sourcePath,
    workspaceRoot,
  } = options;

  for (const relation of analysis?.relations ?? []) {
    const targetPath = relation.resolvedPath ?? relation.toFilePath;
    if (!targetPath) {
      continue;
    }

    const targetRelative = path.relative(workspaceRoot, targetPath);
    const edgeId = createGraphEdgeId({
      from: sourcePath,
      to: targetRelative,
      kind: relation.kind,
      type: relation.type,
      variant: relation.variant,
    });
    if (edgeSet.has(edgeId)) {
      continue;
    }

    const pluginId = relation.pluginId ?? plugin?.id;

    const edge: IGraphEdge = {
      id: edgeId,
      from: sourcePath,
      to: targetRelative,
      kind: relation.kind,
      sources: pluginId ? [{
        id: `${pluginId}:${relation.sourceId}`,
        pluginId,
        sourceId: relation.sourceId,
        label: relation.sourceId,
        metadata: relation.metadata,
        variant: relation.variant,
      }] : [],
    };

    edgeSet.add(edgeId);
    edges.push(edge);
  }
}
