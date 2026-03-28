import { describe, it, expect } from 'vitest';
import { buildPluginEntries } from '../../../src/webview/components/graphContextMenu/pluginEntries';
import type { GraphContextMenuEntry, GraphContextSelection } from '../../../src/webview/components/graphContextMenu/types';
import type { IPluginContextMenuItem } from '../../../src/shared/contracts';

function itemLabels(entries: GraphContextMenuEntry[]): string[] {
  return entries
    .filter(entry => entry.kind === 'item')
    .map(entry => (entry as Extract<GraphContextMenuEntry, { kind: 'item' }>).label);
}

function separatorIds(entries: GraphContextMenuEntry[]): string[] {
  return entries
    .filter(entry => entry.kind === 'separator')
    .map(entry => entry.id);
}

function makePluginItem(overrides: Partial<IPluginContextMenuItem> = {}): IPluginContextMenuItem {
  return {
    pluginId: 'test-plugin',
    label: 'Test Action',
    when: 'node',
    index: 0,
    ...overrides,
  };
}

describe('buildPluginEntries', () => {
  it('returns empty array for background selection', () => {
    const selection: GraphContextSelection = { kind: 'background', targets: [] };
    const result = buildPluginEntries(selection, [makePluginItem()]);
    expect(result).toEqual([]);
  });

  it('returns empty array for multi-select node selection', () => {
    const selection: GraphContextSelection = { kind: 'node', targets: ['a.ts', 'b.ts'] };
    const result = buildPluginEntries(selection, [makePluginItem()]);
    expect(result).toEqual([]);
  });

  it('returns empty array when no plugin items match the selection type', () => {
    const selection: GraphContextSelection = { kind: 'node', targets: ['a.ts'] };
    const result = buildPluginEntries(selection, [makePluginItem({ when: 'edge' })]);
    expect(result).toEqual([]);
  });

  it('returns entries for single node selection with matching plugin items', () => {
    const selection: GraphContextSelection = { kind: 'node', targets: ['a.ts'] };
    const items = [makePluginItem({ label: 'Analyze', index: 0 })];
    const result = buildPluginEntries(selection, items);

    expect(separatorIds(result)).toContain('plugins-separator');
    expect(itemLabels(result)).toContain('Analyze');
  });

  it('returns entries for edge selection with matching plugin items', () => {
    const selection: GraphContextSelection = { kind: 'edge', targets: ['a.ts', 'b.ts'], edgeId: 'a->b' };
    const items = [makePluginItem({ when: 'edge', label: 'Edge Action', index: 0 })];
    const result = buildPluginEntries(selection, items);

    expect(itemLabels(result)).toContain('Edge Action');
  });

  it('includes "both" when items for node selection', () => {
    const selection: GraphContextSelection = { kind: 'node', targets: ['a.ts'] };
    const items = [makePluginItem({ when: 'both', label: 'Universal', index: 0 })];
    const result = buildPluginEntries(selection, items);

    expect(itemLabels(result)).toContain('Universal');
  });

  it('includes "both" when items for edge selection', () => {
    const selection: GraphContextSelection = { kind: 'edge', targets: ['a.ts', 'b.ts'], edgeId: 'a->b' };
    const items = [makePluginItem({ when: 'both', label: 'Universal', index: 0 })];
    const result = buildPluginEntries(selection, items);

    expect(itemLabels(result)).toContain('Universal');
  });

  it('inserts group separators between items with different groups', () => {
    const selection: GraphContextSelection = { kind: 'node', targets: ['a.ts'] };
    const items = [
      makePluginItem({ label: 'A1', index: 0, group: 'groupA' }),
      makePluginItem({ label: 'B1', index: 1, group: 'groupB' }),
    ];
    const result = buildPluginEntries(selection, items);

    const seps = separatorIds(result);
    expect(seps).toContain('plugins-separator');
    expect(seps.some(id => id.startsWith('plugins-group-separator'))).toBe(true);
  });

  it('does not insert group separator when items share the same group', () => {
    const selection: GraphContextSelection = { kind: 'node', targets: ['a.ts'] };
    const items = [
      makePluginItem({ label: 'A1', index: 0, group: 'groupA' }),
      makePluginItem({ label: 'A2', index: 1, group: 'groupA' }),
    ];
    const result = buildPluginEntries(selection, items);

    const groupSeps = separatorIds(result).filter(id => id.startsWith('plugins-group-separator'));
    expect(groupSeps).toHaveLength(0);
  });

  it('does not insert group separator when first item has a group but idx is 0', () => {
    const selection: GraphContextSelection = { kind: 'node', targets: ['a.ts'] };
    const items = [
      makePluginItem({ label: 'Only', index: 0, group: 'groupA' }),
    ];
    const result = buildPluginEntries(selection, items);

    const groupSeps = separatorIds(result).filter(id => id.startsWith('plugins-group-separator'));
    expect(groupSeps).toHaveLength(0);
  });

  it('does not insert group separator when previous group is undefined', () => {
    const selection: GraphContextSelection = { kind: 'node', targets: ['a.ts'] };
    const items = [
      makePluginItem({ label: 'NoGroup', index: 0 }),
      makePluginItem({ label: 'HasGroup', index: 1, group: 'groupB' }),
    ];
    const result = buildPluginEntries(selection, items);

    const groupSeps = separatorIds(result).filter(id => id.startsWith('plugins-group-separator'));
    expect(groupSeps).toHaveLength(0);
  });

  it('does not insert group separator when current item group is undefined', () => {
    const selection: GraphContextSelection = { kind: 'node', targets: ['a.ts'] };
    const items = [
      makePluginItem({ label: 'HasGroup', index: 0, group: 'groupA' }),
      makePluginItem({ label: 'NoGroup', index: 1 }),
    ];
    const result = buildPluginEntries(selection, items);

    const groupSeps = separatorIds(result).filter(id => id.startsWith('plugins-group-separator'));
    expect(groupSeps).toHaveLength(0);
  });

  it('constructs entry ids from plugin id and index', () => {
    const selection: GraphContextSelection = { kind: 'node', targets: ['a.ts'] };
    const items = [makePluginItem({ pluginId: 'my-plugin', index: 3 })];
    const result = buildPluginEntries(selection, items);

    const itemEntry = result.find(e => e.kind === 'item') as Extract<GraphContextMenuEntry, { kind: 'item' }>;
    expect(itemEntry.id).toBe('plugin-my-plugin-3');
  });

  it('uses node target id for plugin action in node selection', () => {
    const selection: GraphContextSelection = { kind: 'node', targets: ['src/app.ts'] };
    const items = [makePluginItem({ index: 0 })];
    const result = buildPluginEntries(selection, items);

    const itemEntry = result.find(e => e.kind === 'item') as Extract<GraphContextMenuEntry, { kind: 'item' }>;
    expect(itemEntry.action).toMatchObject({
      kind: 'plugin',
      targetId: 'src/app.ts',
      targetType: 'node',
    });
  });

  it('uses edge id as target id for plugin action in edge selection', () => {
    const selection: GraphContextSelection = { kind: 'edge', targets: ['a.ts', 'b.ts'], edgeId: 'edge-1' };
    const items = [makePluginItem({ when: 'edge', index: 0 })];
    const result = buildPluginEntries(selection, items);

    const itemEntry = result.find(e => e.kind === 'item') as Extract<GraphContextMenuEntry, { kind: 'item' }>;
    expect(itemEntry.action).toMatchObject({
      kind: 'plugin',
      targetId: 'edge-1',
      targetType: 'edge',
    });
  });

  it('returns empty array when edge selection has no edgeId', () => {
    const selection: GraphContextSelection = { kind: 'edge', targets: ['a.ts', 'b.ts'] };
    const items = [makePluginItem({ when: 'edge', index: 0 })];
    const result = buildPluginEntries(selection, items);

    expect(result).toEqual([]);
  });
});
