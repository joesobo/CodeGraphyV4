import { describe, expect, it } from 'vitest';
import { buildGraphContextMenuEntries } from '../../../../../src/webview/components/graph/contextMenu/build/entries';
import {
  makeEdgeContextSelection,
} from '../../../../../src/webview/components/graph/contextMenu/selection';

describe('graph/contextMenu/build/edge', () => {
  it('does not show Compare Selected for a Relationship context', () => {
    const entries = buildGraphContextMenuEntries({
      selection: makeEdgeContextSelection('src/a.ts->src/b.ts', 'src/a.ts', 'src/b.ts'),
      favorites: new Set(),
    });

    expect(entries).not.toContainEqual(expect.objectContaining({
      kind: 'item',
      label: 'Compare Selected',
    }));
  });

  it('builds edge open and copy actions', () => {
    const entries = buildGraphContextMenuEntries({
      selection: makeEdgeContextSelection('src/a.ts->src/b.ts', 'src/a.ts', 'src/b.ts'),
      favorites: new Set(),
    });

    expect(entries).toMatchObject([
      {
        kind: 'header',
        header: {
          kind: 'edge',
          source: { label: 'src/a.ts' },
          target: { label: 'src/b.ts' },
        },
      },
      { kind: 'separator' },
      { kind: 'item', label: 'Open Source' },
      { kind: 'item', label: 'Open Target' },
      { kind: 'item', label: 'Copy Source Path' },
      { kind: 'item', label: 'Copy Target Path' },
      { kind: 'item', label: 'Copy Both Paths' },
    ]);
  });
});
