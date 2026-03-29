import { describe, it, expect } from 'vitest';
import {
  separator,
  builtInItem,
  pluginItem,
} from '../../../../src/webview/components/graph/contextMenu/common/entryFactories';

describe('separator', () => {
  it('creates a separator entry with the given id', () => {
    const entry = separator('my-sep');
    expect(entry).toEqual({ kind: 'separator', id: 'my-sep' });
  });
});

describe('builtInItem', () => {
  it('creates an item entry with builtin action', () => {
    const entry = builtInItem('test-id', 'Test Label', 'open');
    expect(entry).toEqual({
      kind: 'item',
      id: 'test-id',
      label: 'Test Label',
      action: { kind: 'builtin', action: 'open' },
      destructive: undefined,
      shortcut: undefined,
    });
  });

  it('passes destructive option through', () => {
    const entry = builtInItem('del', 'Delete', 'delete', { destructive: true });
    expect(entry.kind).toBe('item');
    if (entry.kind === 'item') {
      expect(entry.destructive).toBe(true);
    }
  });

  it('passes shortcut option through', () => {
    const entry = builtInItem('open', 'Open', 'open', { shortcut: 'Enter' });
    expect(entry.kind).toBe('item');
    if (entry.kind === 'item') {
      expect(entry.shortcut).toBe('Enter');
    }
  });

  it('sets destructive and shortcut to undefined when no options provided', () => {
    const entry = builtInItem('test', 'Test', 'refresh');
    if (entry.kind === 'item') {
      expect(entry.destructive).toBeUndefined();
      expect(entry.shortcut).toBeUndefined();
    }
  });
});

describe('pluginItem', () => {
  it('creates an item entry with plugin action', () => {
    const entry = pluginItem('p-1', 'Plugin Action', 'my-plugin', 0, 'file.ts', 'node');
    expect(entry).toEqual({
      kind: 'item',
      id: 'p-1',
      label: 'Plugin Action',
      action: {
        kind: 'plugin',
        pluginId: 'my-plugin',
        index: 0,
        targetId: 'file.ts',
        targetType: 'node',
      },
    });
  });

  it('creates plugin item with edge target type', () => {
    const entry = pluginItem('p-2', 'Edge Action', 'edge-plugin', 1, 'edge-1', 'edge');
    if (entry.kind === 'item') {
      expect(entry.action).toMatchObject({
        kind: 'plugin',
        targetType: 'edge',
        targetId: 'edge-1',
        pluginId: 'edge-plugin',
        index: 1,
      });
    }
  });
});
