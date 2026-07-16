import { describe, expect, it } from 'vitest';
import { buildGraphContextMenuEntries } from '../../../../../src/webview/components/graph/contextMenu/build/entries';
import {
  makeEdgeContextSelection,
} from '../../../../../src/webview/components/graph/contextMenu/selection';

describe('graph/contextMenu/build/edge', () => {
  it('builds edge open and copy actions', () => {
    const entries = buildGraphContextMenuEntries({
      selection: makeEdgeContextSelection('src/a.ts->src/b.ts', 'src/a.ts', 'src/b.ts'),
      favorites: new Set(),
      pluginItems: [],
    });

    expect(entries).toHaveLength(5);
    expect(entries).toMatchObject([
      { kind: 'item', label: 'Open Source' },
      { kind: 'item', label: 'Open Target' },
      { kind: 'item', label: 'Copy Source Path' },
      { kind: 'item', label: 'Copy Target Path' },
      { kind: 'item', label: 'Copy Both Paths' },
    ]);
  });
});
