import { describe, expect, it } from 'vitest';
import type { GraphContextMenuEntry } from '../../../../../src/webview/components/graph/contextMenu/contracts';
import { buildNodeEntries } from '../../../../../src/webview/components/graph/contextMenu/node/entries';

function itemLabels(entries: readonly GraphContextMenuEntry[]): string[] {
  return entries
    .filter((entry) => entry.kind === 'item')
    .map((entry) => entry.label);
}

function item(
  entries: readonly GraphContextMenuEntry[],
  label: string,
): Extract<GraphContextMenuEntry, { kind: 'item' }> | undefined {
  return entries.find((entry): entry is Extract<GraphContextMenuEntry, { kind: 'item' }> =>
    entry.kind === 'item' && entry.label === label
  );
}

describe('graph/contextMenu/node/entries', () => {
  it('hides destructive file actions when mutation availability is hidden', () => {
    const entries = buildNodeEntries(['src/app.ts'], 'hidden', new Set());

    expect(itemLabels(entries)).not.toContain('Rename');
    expect(itemLabels(entries)).not.toContain('Delete File');
  });

  it('enables destructive file actions when mutation availability is enabled', () => {
    const entries = buildNodeEntries(['src/app.ts'], 'enabled', new Set());

    expect(item(entries, 'Rename')?.disabled).toBe(false);
    expect(item(entries, 'Delete File')?.disabled).toBe(false);
  });

  it('disables destructive file actions when mutation availability is disabled', () => {
    const entries = buildNodeEntries(['src/app.ts'], 'disabled', new Set());

    expect(item(entries, 'Rename')?.disabled).toBe(true);
    expect(item(entries, 'Delete File')?.disabled).toBe(true);
  });
});
