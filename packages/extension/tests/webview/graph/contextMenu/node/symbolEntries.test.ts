import { describe, expect, it } from 'vitest';
import { buildSingleSymbolNodeEntries } from '../../../../../src/webview/components/graph/contextMenu/node/symbolEntries';

describe('graph/contextMenu/node/symbolEntries', () => {
  it('builds the stable symbol node actions and favorite target', () => {
    const entries = buildSingleSymbolNodeEntries('symbol:src/index.ts#main', new Set([
      'symbol:src/index.ts#main',
    ]));

    expect(entries).toEqual([
      {
        action: { kind: 'builtin', action: 'open' },
        id: 'node-go-to-symbol',
        kind: 'item',
        label: 'Go to Symbol',
      },
      {
        action: { kind: 'builtin', action: 'reveal' },
        id: 'node-reveal-symbol-file',
        kind: 'item',
        label: 'Reveal File',
      },
      { id: 'node-separator-copy', kind: 'separator' },
      {
        action: { kind: 'builtin', action: 'copySymbolId' },
        id: 'node-copy-symbol-id',
        kind: 'item',
        label: 'Copy Symbol ID',
      },
      {
        action: { kind: 'builtin', action: 'copySymbolName' },
        id: 'node-copy-symbol-name',
        kind: 'item',
        label: 'Copy Symbol Name',
      },
      { id: 'node-separator-favorites', kind: 'separator' },
      {
        action: { kind: 'builtin', action: 'toggleFavorite' },
        id: 'node-toggle-favorite',
        kind: 'item',
        label: 'Remove from Favorites',
      },
      {
        action: { kind: 'builtin', action: 'focus' },
        id: 'node-focus',
        kind: 'item',
        label: 'Focus Node',
      },
    ]);
  });
});
