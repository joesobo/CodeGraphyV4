import { describe, it, expect } from 'vitest';
import { buildEdgeEntries } from '../../../../../src/webview/components/graph/contextMenu/edge/entries';
import type { GraphContextMenuEntry } from '../../../../../src/webview/components/graph/contextMenu/contracts';

function itemLabels(entries: GraphContextMenuEntry[]): string[] {
  return entries
    .filter(entry => entry.kind === 'item')
    .map(entry => (entry as Extract<GraphContextMenuEntry, { kind: 'item' }>).label);
}

function itemActions(entries: GraphContextMenuEntry[]): string[] {
  return entries
    .filter(entry => entry.kind === 'item')
    .map(entry => {
      const item = entry as Extract<GraphContextMenuEntry, { kind: 'item' }>;
      return item.action.kind === 'builtin' ? item.action.action : '';
    });
}

describe('buildEdgeEntries', () => {
  it('includes Copy Source Path when sourceId is present', () => {
    const entries = buildEdgeEntries(['a.ts', 'b.ts']);
    expect(itemLabels(entries)).toContain('Copy Source Path');
  });

  it('includes Copy Target Path when targetId is present', () => {
    const entries = buildEdgeEntries(['a.ts', 'b.ts']);
    expect(itemLabels(entries)).toContain('Copy Target Path');
  });

  it('includes Copy Both Paths when both sourceId and targetId are present', () => {
    const entries = buildEdgeEntries(['a.ts', 'b.ts']);
    expect(itemLabels(entries)).toContain('Copy Both Paths');
    expect(itemActions(entries)).toContain('copyEdgeBoth');
  });

  it('omits Copy Target Path when targetId is absent', () => {
    const entries = buildEdgeEntries(['a.ts']);
    expect(itemLabels(entries)).toContain('Copy Source Path');
    expect(itemLabels(entries)).not.toContain('Copy Target Path');
    expect(itemLabels(entries)).not.toContain('Copy Both Paths');
  });

  it('omits Copy Source Path when sourceId is empty string', () => {
    const entries = buildEdgeEntries(['', 'b.ts']);
    expect(itemLabels(entries)).not.toContain('Copy Source Path');
    expect(itemLabels(entries)).toContain('Copy Target Path');
    expect(itemLabels(entries)).not.toContain('Copy Both Paths');
  });

  it('returns empty array when targets array is empty', () => {
    const entries = buildEdgeEntries([]);
    expect(entries).toEqual([]);
  });

  it('uses correct built-in action ids', () => {
    const entries = buildEdgeEntries(['a.ts', 'b.ts']);
    expect(itemActions(entries)).toEqual(['copyEdgeSource', 'copyEdgeTarget', 'copyEdgeBoth']);
  });
});
