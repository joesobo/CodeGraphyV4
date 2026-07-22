import { describe, expect, it } from 'vitest';
import type { IPluginContextMenuItem } from '../../../../../src/shared/plugins/contextMenu';
import { buildPluginEntriesForDecision } from '../../../../../src/webview/components/graph/contextMenu/plugin/entries';

const groupedItems: IPluginContextMenuItem[] = [
  { label: 'First A', when: 'node', pluginId: 'acme', index: 0, group: 'A' },
  { label: 'Second A', when: 'node', pluginId: 'acme', index: 1, group: 'A' },
  { label: 'First B', when: 'node', pluginId: 'acme', index: 2, group: 'B' },
  { label: 'Ungrouped', when: 'node', pluginId: 'acme', index: 3 },
  { label: 'Group C', when: 'node', pluginId: 'acme', index: 4, group: 'C' },
];

describe('graph/contextMenu/plugin/entries', () => {
  it('builds no plugin entries for background or unmatched plugin targets', () => {
    expect(buildPluginEntriesForDecision({ kind: 'background' }, groupedItems)).toEqual([]);

    expect(buildPluginEntriesForDecision({
      kind: 'edge',
      edgeId: 'src/a.ts->src/b.ts',
      targets: ['src/a.ts', 'src/b.ts'],
    }, [
      { label: 'Node Only', when: 'node', pluginId: 'acme', index: 0 },
    ])).toEqual([]);
  });

  it('builds node entries with stable separators, ids, and actions', () => {
    const entries = buildPluginEntriesForDecision({
      kind: 'singleFileNode',
      target: { id: 'src/app.ts', nodeKind: 'file', nodeType: 'file' },
    }, groupedItems);

    expect(entries.map(entry => entry.id)).toEqual([
      'plugins-separator',
      'plugin-acme-0',
      'plugin-acme-1',
      'plugins-group-separator-2',
      'plugin-acme-2',
      'plugin-acme-3',
      'plugin-acme-4',
    ]);
    expect(entries.filter(entry => entry.kind === 'separator')).toHaveLength(2);
    expect(entries.filter(entry => entry.kind === 'item').map(entry => entry.action)).toEqual([
      { kind: 'plugin', pluginId: 'acme', index: 0, targetId: 'src/app.ts', targetType: 'node' },
      { kind: 'plugin', pluginId: 'acme', index: 1, targetId: 'src/app.ts', targetType: 'node' },
      { kind: 'plugin', pluginId: 'acme', index: 2, targetId: 'src/app.ts', targetType: 'node' },
      { kind: 'plugin', pluginId: 'acme', index: 3, targetId: 'src/app.ts', targetType: 'node' },
      { kind: 'plugin', pluginId: 'acme', index: 4, targetId: 'src/app.ts', targetType: 'node' },
    ]);
  });

  it('builds edge entries for edge and universal plugin items', () => {
    const entries = buildPluginEntriesForDecision({
      kind: 'edge',
      targets: ['src/a.ts', 'src/b.ts'],
      edgeId: 'edge-1',
    }, [
      { label: 'Both', when: 'both', pluginId: 'acme', index: 1 },
      { label: 'Edge Only', when: 'edge', pluginId: 'acme', index: 2 },
    ]);

    expect(entries.map(entry => entry.id)).toEqual([
      'plugins-separator',
      'plugin-acme-1',
      'plugin-acme-2',
    ]);
    expect(entries.filter(entry => entry.kind === 'item').map(entry => entry.action)).toEqual([
      { kind: 'plugin', pluginId: 'acme', index: 1, targetId: 'edge-1', targetType: 'edge' },
      { kind: 'plugin', pluginId: 'acme', index: 2, targetId: 'edge-1', targetType: 'edge' },
    ]);
  });
});
