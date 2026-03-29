import { describe, it, expect } from 'vitest';
import {
  buildOpenBlock,
  buildCopyBlock,
} from '../../../../src/webview/components/graph/contextMenu/node/openCopyBlocks';
import type { GraphContextMenuEntry } from '../../../../src/webview/components/graph/contextMenu/contracts';

type ItemEntry = Extract<GraphContextMenuEntry, { kind: 'item' }>;

function getItems(entries: GraphContextMenuEntry[]): ItemEntry[] {
  return entries.filter((e): e is ItemEntry => e.kind === 'item');
}

describe('buildOpenBlock (mutation kill tests)', () => {
  /**
   * Kill L13:17 StringLiteral: "" — mutant replaces 'open' action with ''
   * Verify exact action string for Open File entry.
   */
  it('produces action "open" for the Open File entry', () => {
    const entries = buildOpenBlock(['a.ts'], false);
    const items = getItems(entries);
    const openItem = items.find(item => item.id === 'node-open');

    expect(openItem).toBeDefined();
    expect(openItem!.label).toBe('Open File');
    expect(openItem!.action).toEqual({ kind: 'builtin', action: 'open' });
    expect((openItem!.action as { kind: 'builtin'; action: string }).action).not.toBe('');
  });

  /**
   * Kill L10:44 ArrayDeclaration: ["Stryker was here"]
   * Mutant replaces `const entries: GraphContextMenuEntry[] = [];`
   * with an array containing garbage. This would cause the entries
   * array to start with unwanted items. Verify the entries are well-formed.
   */
  it('starts with exactly the Open entry, not garbage data', () => {
    const entries = buildOpenBlock(['a.ts'], false);

    // First entry should be the Open File item, not some Stryker garbage
    expect(entries[0].kind).toBe('item');
    expect((entries[0] as ItemEntry).label).toBe('Open File');
    expect((entries[0] as ItemEntry).id).toBe('node-open');
  });

  it('produces only well-formed entries without extra items', () => {
    const entries = buildOpenBlock(['a.ts'], false);

    // Should be exactly 2: Open File + Reveal in Explorer
    expect(entries).toHaveLength(2);
    for (const entry of entries) {
      expect(entry.kind).toBe('item');
      expect((entry as ItemEntry).label).not.toBe('');
      expect((entry as ItemEntry).label).not.toBe('Stryker was here');
    }
  });

  /**
   * Kill L17:30 StringLiteral: "" — mutant replaces 'reveal' action with ''
   * Verify exact action string for Reveal in Explorer entry.
   */
  it('produces action "reveal" for the Reveal in Explorer entry', () => {
    const entries = buildOpenBlock(['a.ts'], false);
    const items = getItems(entries);
    const revealItem = items.find(item => item.id === 'node-reveal');

    expect(revealItem).toBeDefined();
    expect(revealItem!.label).toBe('Reveal in Explorer');
    expect(revealItem!.action).toEqual({ kind: 'builtin', action: 'reveal' });
    expect((revealItem!.action as { kind: 'builtin'; action: string }).action).not.toBe('');
  });

  it('multi-select has exact "Open N Files" label and "open" action', () => {
    const entries = buildOpenBlock(['a.ts', 'b.ts'], false);
    const items = getItems(entries);

    expect(items).toHaveLength(1);
    expect(items[0].label).toBe('Open 2 Files');
    expect(items[0].action).toEqual({ kind: 'builtin', action: 'open' });
  });
});

describe('buildCopyBlock (mutation kill tests)', () => {
  /**
   * Kill L31:7 StringLiteral: "" — mutant replaces 'copyRelative' action with ''
   * Verify exact action string for Copy Relative Path entry.
   */
  it('produces action "copyRelative" for the Copy Relative Path entry', () => {
    const entries = buildCopyBlock(['a.ts']);
    const items = getItems(entries);
    const relativeItem = items.find(item => item.id === 'node-copy-relative');

    expect(relativeItem).toBeDefined();
    expect(relativeItem!.label).toBe('Copy Relative Path');
    expect(relativeItem!.action).toEqual({ kind: 'builtin', action: 'copyRelative' });
    expect((relativeItem!.action as { kind: 'builtin'; action: string }).action).not.toBe('');
  });

  /**
   * Kill L38:30 StringLiteral: "" — mutant replaces 'copyAbsolute' action with ''
   * Verify exact action string for Copy Absolute Path entry.
   */
  it('produces action "copyAbsolute" for the Copy Absolute Path entry', () => {
    const entries = buildCopyBlock(['a.ts']);
    const items = getItems(entries);
    const absoluteItem = items.find(item => item.id === 'node-copy-absolute');

    expect(absoluteItem).toBeDefined();
    expect(absoluteItem!.label).toBe('Copy Absolute Path');
    expect(absoluteItem!.action).toEqual({ kind: 'builtin', action: 'copyAbsolute' });
    expect((absoluteItem!.action as { kind: 'builtin'; action: string }).action).not.toBe('');
  });

  it('multi-select produces "Copy Relative Paths" label with correct action', () => {
    const entries = buildCopyBlock(['a.ts', 'b.ts']);
    const items = getItems(entries);

    expect(items).toHaveLength(1);
    expect(items[0].label).toBe('Copy Relative Paths');
    expect(items[0].action).toEqual({ kind: 'builtin', action: 'copyRelative' });
  });

  it('has non-empty action and label strings for all items', () => {
    const entries = buildCopyBlock(['a.ts']);
    const items = getItems(entries);

    for (const item of items) {
      expect(item.label).not.toBe('');
      expect(item.label.length).toBeGreaterThan(0);
      if (item.action.kind === 'builtin') {
        expect(item.action.action).not.toBe('');
        expect(item.action.action.length).toBeGreaterThan(0);
      }
    }
  });
});
