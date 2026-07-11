import { describe, expect, it } from 'vitest';
import { buildGraphContextMenuEntries } from '../../../../../src/webview/components/graph/contextMenu/build/entries';
import {
  makeBackgroundContextSelection,
} from '../../../../../src/webview/components/graph/contextMenu/selection';

describe('graph/contextMenu/build/background', () => {
  it('builds creation and view actions for the current Graph Revision', () => {
    const entries = buildGraphContextMenuEntries({
      selection: makeBackgroundContextSelection(),
      timelineActive: false,
      favorites: new Set(),
      pluginItems: [],
    });

    expect(entries).toHaveLength(6);
    expect(entries).toMatchObject([
      { kind: 'item', label: 'New File', disabled: false },
      { kind: 'item', label: 'New Folder', disabled: false },
      { kind: 'item', label: 'Paste', disabled: false },
      { kind: 'separator' },
      { kind: 'item', label: 'Refresh' },
      { kind: 'item', label: 'Fit All Nodes' },
    ]);
  });
});
