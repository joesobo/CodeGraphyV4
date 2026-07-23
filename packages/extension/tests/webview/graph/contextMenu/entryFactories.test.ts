import { describe, it, expect } from 'vitest';
import {
  separator,
  builtInItem,
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
