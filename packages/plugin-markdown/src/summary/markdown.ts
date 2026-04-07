import type { IGraphData, IGraphEdge } from '@codegraphy-vscode/plugin-api';
import { buildWikilinkCounts } from './counts';
import { getMarkdownNotes, getOrphanNotes, getTopLinkedNotes, rankNotes } from './ranking';
import { renderSummaryMarkdown } from './render';

export function buildWikilinkSummaryMarkdown(
  graph: IGraphData,
  referenceEdges: IGraphEdge[],
): string {
  const notes = getMarkdownNotes(graph);
  const { linkedNodeIds, linkCounts } = buildWikilinkCounts(referenceEdges);
  const rankedNotes = rankNotes(notes, linkCounts, linkedNodeIds);

  return renderSummaryMarkdown(
    notes.length,
    referenceEdges.length,
    getTopLinkedNotes(rankedNotes),
    getOrphanNotes(rankedNotes),
  );
}
