import { describe, it, expect } from 'vitest';
import { buildBackgroundEntries } from '../../../../src/webview/components/graph/contextMenu/background/entries';
import type { GraphContextMenuEntry } from '../../../../src/webview/components/graph/contextMenu/contracts';

function itemLabels(entries: GraphContextMenuEntry[]): string[] {
  return entries
    .filter(entry => entry.kind === 'item')
    .map(entry => (entry as Extract<GraphContextMenuEntry, { kind: 'item' }>).label);
}

function separatorCount(entries: GraphContextMenuEntry[]): number {
  return entries.filter(entry => entry.kind === 'separator').length;
}

describe('buildBackgroundEntries', () => {
  it('includes New File and separator when timeline is not active', () => {
    const entries = buildBackgroundEntries(false);
    expect(itemLabels(entries)).toContain('New File...');
    expect(separatorCount(entries)).toBe(1);
  });

  it('omits New File and separator when timeline is active', () => {
    const entries = buildBackgroundEntries(true);
    expect(itemLabels(entries)).not.toContain('New File...');
    expect(separatorCount(entries)).toBe(0);
  });

  it('always includes Refresh Graph', () => {
    expect(itemLabels(buildBackgroundEntries(false))).toContain('Refresh Graph');
    expect(itemLabels(buildBackgroundEntries(true))).toContain('Refresh Graph');
  });

  it('always includes Fit All Nodes', () => {
    expect(itemLabels(buildBackgroundEntries(false))).toContain('Fit All Nodes');
    expect(itemLabels(buildBackgroundEntries(true))).toContain('Fit All Nodes');
  });

  it('returns 4 entries when timeline is not active', () => {
    const entries = buildBackgroundEntries(false);
    expect(entries).toHaveLength(4);
  });

  it('returns 2 entries when timeline is active', () => {
    const entries = buildBackgroundEntries(true);
    expect(entries).toHaveLength(2);
  });
});
