import type { IGraphEdge } from '../../../../shared/graph/contracts';

export function mergeGitHistoryEdgeSources(
  targetEdge: IGraphEdge,
  sourceEdge: IGraphEdge,
): void {
  const mergedSources = [...targetEdge.sources];
  const seenSourceIds = new Set(mergedSources.map((source) => source.id));

  for (const source of sourceEdge.sources) {
    if (seenSourceIds.has(source.id)) {
      continue;
    }

    seenSourceIds.add(source.id);
    mergedSources.push(source);
  }

  targetEdge.sources = mergedSources;
}
