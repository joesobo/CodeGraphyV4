import { describe, expect, it } from 'vitest';
import { buildNodeClipboardEntries } from '../../../../../src/webview/components/graph/contextMenu/node/clipboardEntries';

describe('graph/contextMenu/node/clipboardEntries', () => {
  it('builds enabled Cut and Copy entries for selected paths', () => {
    expect(buildNodeClipboardEntries(['src/app.ts'], 'enabled', false)).toEqual([
      {
        action: { kind: 'builtin', action: 'cutFiles' },
        disabled: false,
        id: 'node-cut-files',
        kind: 'item',
        label: 'Cut',
      },
      {
        action: { kind: 'builtin', action: 'copyFiles' },
        disabled: false,
        id: 'node-copy-files',
        kind: 'item',
        label: 'Copy',
      },
    ]);
  });

  it('builds Paste without Cut or Copy for a root destination', () => {
    expect(buildNodeClipboardEntries([], 'enabled', true)).toEqual([
      expect.objectContaining({ label: 'Paste', disabled: false }),
    ]);
  });

  it('disables every clipboard entry when mutation is disabled', () => {
    const entries = buildNodeClipboardEntries(['src'], 'disabled', true);

    expect(entries).toHaveLength(3);
    expect(entries.every((entry) => entry.kind === 'item' && entry.disabled)).toBe(true);
  });

  it('hides every clipboard entry when mutation is hidden', () => {
    expect(buildNodeClipboardEntries(['src'], 'hidden', true)).toEqual([]);
  });
});
