import { describe, expect, it } from 'vitest';
import { buildGraphContextMenuEntries } from '../../../../../src/webview/components/graph/contextMenu/build/entries';
import {
  makeNodeContextSelection,
} from '../../../../../src/webview/components/graph/contextMenu/selection';

describe('graph/contextMenu/build/plugin', () => {
  it('appends eligible plugin entries after built-in entries', () => {
    const entries = buildGraphContextMenuEntries({
      selection: makeNodeContextSelection('src/app.ts', new Set()),
      favorites: new Set(),
      pluginItems: [
        { label: 'Plugin Node Action', when: 'node', pluginId: 'acme', index: 0 },
      ],
    });

    expect(entries.length).toBeGreaterThan(1);
    expect(entries.at(-1)).toMatchObject({
      kind: 'item',
      label: 'Plugin Node Action',
      action: { kind: 'plugin', pluginId: 'acme', index: 0, targetId: 'src/app.ts' },
    });
  });
});
