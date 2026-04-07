import type { RankedNode } from './types';

export function renderSummaryMarkdown(
  noteCount: number,
  wikilinkCount: number,
  topNotes: RankedNode[],
  orphanNotes: RankedNode[],
): string {
  return [
    '# Markdown Wikilink Summary',
    '',
    `- Notes: ${noteCount}`,
    `- Wikilinks: ${wikilinkCount}`,
    `- Orphan notes: ${orphanNotes.length}`,
    '',
    '## Most linked notes',
    renderRankedNotes(topNotes),
    '',
    '## Orphan notes',
    renderOrphanNotes(orphanNotes),
    '',
  ].join('\n');
}

function renderRankedNotes(entries: RankedNode[]): string {
  return renderList(entries, entry => [
    `- \`${entry.node.label}\``,
    `(${entry.linkCount} wikilinks, ${entry.neighborCount} neighbors)`,
  ].join(' '));
}

function renderOrphanNotes(entries: RankedNode[]): string {
  return renderList(entries, entry => `- \`${entry.node.label}\``);
}

function renderList(entries: RankedNode[], formatEntry: (entry: RankedNode) => string): string {
  return entries.length > 0 ? entries.map(formatEntry).join('\n') : '- None';
}

