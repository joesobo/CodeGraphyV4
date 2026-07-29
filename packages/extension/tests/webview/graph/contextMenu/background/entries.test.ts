import { describe, expect, it } from 'vitest';
import { buildBackgroundEntries } from '../../../../../src/webview/components/graph/contextMenu/background/entries';
import type { GraphContextMenuEntry } from '../../../../../src/webview/components/graph/contextMenu/contracts';

function itemLabels(entries: GraphContextMenuEntry[]): string[] {
  return entries
    .filter(entry => entry.kind === 'item')
    .map(entry => (entry as Extract<GraphContextMenuEntry, { kind: 'item' }>).label);
}

describe('buildBackgroundEntries', () => {
  it('orders New File, New Folder, Re-index Workspace, and Fit All Nodes', () => {
    expect(itemLabels(buildBackgroundEntries())).toEqual([
      'New File',
      'New Folder',
      'Re-index Workspace',
      'Fit All Nodes',
    ]);
  });

  it('places one separator between creation and graph actions', () => {
    expect(buildBackgroundEntries().filter(entry => entry.kind === 'separator')).toHaveLength(1);
  });

  it('always includes Re-index Workspace', () => {
    expect(itemLabels(buildBackgroundEntries())).toContain('Re-index Workspace');
  });

  it('always includes Fit All Nodes', () => {
    expect(itemLabels(buildBackgroundEntries())).toContain('Fit All Nodes');
  });

  it('returns five entries', () => {
    expect(buildBackgroundEntries()).toHaveLength(5);
  });
});
