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
    const entries = buildNodeEntries(['src/app.ts'], false, 'hidden', new Set(), true);

    expect(itemLabels(entries)).not.toContain('Rename');
    expect(itemLabels(entries)).not.toContain('Delete File');
  });

  it('enables destructive file actions when mutation availability is enabled', () => {
    const entries = buildNodeEntries(['src/app.ts'], false, 'enabled', new Set(), true);

    expect(item(entries, 'Rename')?.disabled).toBe(false);
    expect(item(entries, 'Delete File')?.disabled).toBe(false);
  });

  it('disables destructive file actions when mutation availability is disabled', () => {
    const entries = buildNodeEntries(['src/app.ts'], false, 'disabled', new Set(), true);

    expect(item(entries, 'Rename')?.disabled).toBe(true);
    expect(item(entries, 'Delete File')?.disabled).toBe(true);
  });

  it('offers Cut and Copy for mutable workspace files', () => {
    const entries = buildNodeEntries(['src/app.ts'], false, 'enabled', new Set(), true);

    expect(item(entries, 'Cut')?.disabled).toBe(false);
    expect(item(entries, 'Copy')?.disabled).toBe(false);
  });

  it('does not offer file clipboard actions for non-file graph nodes', () => {
    const entries = buildNodeEntries(['pkg:npm'], false, 'enabled', new Set(), false);

    expect(itemLabels(entries)).not.toContain('Cut');
    expect(itemLabels(entries)).not.toContain('Copy');
  });
});
