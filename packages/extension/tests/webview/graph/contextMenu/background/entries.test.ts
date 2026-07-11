import { describe, it, expect } from 'vitest';
import { buildBackgroundEntries } from '../../../../../src/webview/components/graph/contextMenu/background/entries';
import type { GraphContextMenuEntry } from '../../../../../src/webview/components/graph/contextMenu/contracts';

function itemLabels(entries: GraphContextMenuEntry[]): string[] {
  return entries
    .filter(entry => entry.kind === 'item')
    .map(entry => (entry as Extract<GraphContextMenuEntry, { kind: 'item' }>).label);
}

function separatorCount(entries: GraphContextMenuEntry[]): number {
  return entries.filter(entry => entry.kind === 'separator').length;
}

describe('buildBackgroundEntries', () => {
  it('orders New File, New Folder, and separator when mutation is enabled', () => {
    const entries = buildBackgroundEntries('enabled');
    expect(itemLabels(entries)).toEqual(['New File', 'New Folder', 'Paste', 'Refresh', 'Fit All Nodes']);
    expect(separatorCount(entries)).toBe(1);
  });

  it('disables New File, New Folder, and Paste when mutation is disabled', () => {
    const entries = buildBackgroundEntries('disabled');
    const items = entries.filter(
      (entry): entry is Extract<GraphContextMenuEntry, { kind: 'item' }> => entry.kind === 'item'
    );
    expect(items.find(item => item.label === 'New File')?.disabled).toBe(true);
    expect(items.find(item => item.label === 'New Folder')?.disabled).toBe(true);
    expect(items.find(item => item.label === 'Paste')?.disabled).toBe(true);
    expect(separatorCount(entries)).toBe(1);
  });

  it('omits New File, New Folder, Paste, and separator when mutation is hidden', () => {
    const entries = buildBackgroundEntries('hidden');
    expect(itemLabels(entries)).not.toContain('New File');
    expect(itemLabels(entries)).not.toContain('New Folder');
    expect(itemLabels(entries)).not.toContain('Paste');
    expect(separatorCount(entries)).toBe(0);
  });

  it('always includes Refresh', () => {
    expect(itemLabels(buildBackgroundEntries('enabled'))).toContain('Refresh');
    expect(itemLabels(buildBackgroundEntries('disabled'))).toContain('Refresh');
    expect(itemLabels(buildBackgroundEntries('hidden'))).toContain('Refresh');
  });

  it('always includes Fit All Nodes', () => {
    expect(itemLabels(buildBackgroundEntries('enabled'))).toContain('Fit All Nodes');
    expect(itemLabels(buildBackgroundEntries('disabled'))).toContain('Fit All Nodes');
    expect(itemLabels(buildBackgroundEntries('hidden'))).toContain('Fit All Nodes');
  });

  it('returns 6 entries when mutation actions are visible', () => {
    const entries = buildBackgroundEntries('enabled');
    expect(entries).toHaveLength(6);
  });

  it('returns 2 entries when mutation actions are hidden', () => {
    const entries = buildBackgroundEntries('hidden');
    expect(entries).toHaveLength(2);
  });
});
