import { describe, expect, it } from 'vitest';
import type { GraphContextMenuEntry } from '../../../../../src/webview/components/graph/contextMenu/contracts';
import { buildNodeEntries } from '../../../../../src/webview/components/graph/contextMenu/node/entries';

function item(
  entries: readonly GraphContextMenuEntry[],
  label: string,
): Extract<GraphContextMenuEntry, { kind: 'item' }> | undefined {
  return entries.find((entry): entry is Extract<GraphContextMenuEntry, { kind: 'item' }> =>
    entry.kind === 'item' && entry.label === label
  );
}

describe('graph/contextMenu/node/entries', () => {
  it('includes enabled destructive file actions', () => {
    const entries = buildNodeEntries(['src/app.ts'], new Set());

    expect(item(entries, 'Rename')?.disabled).toBe(false);
    expect(item(entries, 'Delete File')?.disabled).toBe(false);
  });
});
