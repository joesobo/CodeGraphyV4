import { describe, expect, it } from 'vitest';
import type { GraphContextMenuEntry } from '../../../../../src/webview/components/graph/contextMenu/contracts';
import type { GraphContextNodeTarget } from '../../../../../src/webview/components/graph/contextMenu/decision/targets';
import { buildSingleFolderNodeEntries } from '../../../../../src/webview/components/graph/contextMenu/node/folderEntries';

function folderTarget(id = 'src'): GraphContextNodeTarget {
  return { id, nodeKind: 'folder', nodeType: 'folder' };
}

function items(entries: readonly GraphContextMenuEntry[]) {
  return entries.filter((entry): entry is Extract<GraphContextMenuEntry, { kind: 'item' }> =>
    entry.kind === 'item'
  );
}

function buildFolderEntries(id = 'src') {
  return buildSingleFolderNodeEntries(folderTarget(id), new Set());
}

describe('graph/contextMenu/node/folderEntries', () => {
  it('builds folder creation and reveal entries with stable ids and actions', () => {
    expect(buildFolderEntries().slice(0, 4)).toEqual([
      { action: { kind: 'builtin', action: 'createFile' }, disabled: false, id: 'node-create-file', kind: 'item', label: 'New File' },
      { action: { kind: 'builtin', action: 'createFolder' }, disabled: false, id: 'node-create-folder', kind: 'item', label: 'New Folder' },
      { id: 'node-separator-create', kind: 'separator' },
      { action: { kind: 'builtin', action: 'reveal' }, id: 'node-reveal', kind: 'item', label: 'Reveal in Explorer' },
    ]);
  });

  it('keeps folder mutation actions enabled', () => {
    const mutationItems = items(buildFolderEntries()).filter(entry =>
      ['New File', 'New Folder', 'Rename Folder', 'Delete Folder'].includes(entry.label)
    );

    expect(mutationItems).toHaveLength(4);
    expect(mutationItems.every(entry => entry.disabled === false)).toBe(true);
  });

  it('does not include destructive actions for the synthetic root folder', () => {
    const labels = items(buildFolderEntries('(root)')).map(entry => entry.label);

    expect(labels).toContain('New File');
    expect(labels).toContain('New Folder');
    expect(labels).not.toContain('Rename Folder');
    expect(labels).not.toContain('Delete Folder');
  });
});
