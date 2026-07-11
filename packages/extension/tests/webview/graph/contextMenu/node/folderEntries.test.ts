import { describe, expect, it } from 'vitest';
import type {
  GraphContextMenuEntry,
  GraphContextMutationAvailability,
} from '../../../../../src/webview/components/graph/contextMenu/contracts';
import type { GraphContextNodeTarget } from '../../../../../src/webview/components/graph/contextMenu/decision/targets';
import { buildSingleFolderNodeEntries } from '../../../../../src/webview/components/graph/contextMenu/node/folderEntries';

function folderTarget(id = 'src'): GraphContextNodeTarget {
  return {
    id,
    nodeKind: 'folder',
    nodeType: 'folder',
  };
}

function items(entries: readonly GraphContextMenuEntry[]) {
  return entries.filter((entry): entry is Extract<GraphContextMenuEntry, { kind: 'item' }> =>
    entry.kind === 'item'
  );
}

function buildFolderEntries(
  mutationAvailability: GraphContextMutationAvailability,
  id = 'src',
) {
  return buildSingleFolderNodeEntries(folderTarget(id), mutationAvailability, new Set());
}

describe('graph/contextMenu/node/folderEntries', () => {
  it('builds enabled folder creation and reveal entries with stable ids and actions', () => {
    const entries = buildFolderEntries('enabled');

    expect(entries.slice(0, 4)).toEqual([
      {
        action: { kind: 'builtin', action: 'createFile' },
        disabled: false,
        id: 'node-create-file',
        kind: 'item',
        label: 'New File',
      },
      {
        action: { kind: 'builtin', action: 'createFolder' },
        disabled: false,
        id: 'node-create-folder',
        kind: 'item',
        label: 'New Folder',
      },
      { id: 'node-separator-create', kind: 'separator' },
      {
        action: { kind: 'builtin', action: 'reveal' },
        id: 'node-reveal',
        kind: 'item',
        label: 'Reveal in Explorer',
      },
    ]);
  });

  it('does not include creation or destructive actions when mutation availability is hidden', () => {
    const entries = buildFolderEntries('hidden');
    const labels = items(entries).map((entry) => entry.label);

    expect(labels).not.toContain('New File');
    expect(labels).not.toContain('New Folder');
    expect(labels).not.toContain('Rename Folder');
    expect(labels).not.toContain('Delete Folder');
    expect(entries.every((entry) => entry.kind === 'item' || entry.kind === 'separator')).toBe(true);
  });

  it('disables creation and destructive actions when mutation availability is disabled', () => {
    const entries = buildFolderEntries('disabled');
    const mutationItems = items(entries).filter((entry) =>
      ['New File', 'New Folder', 'Rename Folder', 'Delete Folder'].includes(entry.label)
    );

    expect(mutationItems).toHaveLength(4);
    expect(mutationItems.every((entry) => entry.disabled === true)).toBe(true);
  });

  it('leaves destructive actions enabled when mutation availability is enabled', () => {
    const entries = buildFolderEntries('enabled');
    const destructiveItems = items(entries).filter((entry) =>
      ['Rename Folder', 'Delete Folder'].includes(entry.label)
    );

    expect(destructiveItems).toHaveLength(2);
    expect(destructiveItems.every((entry) => entry.disabled === false)).toBe(true);
  });

  it('offers cut, copy, and paste for a mutable folder', () => {
    const clipboardItems = items(buildFolderEntries('enabled')).filter((entry) =>
      ['Cut', 'Copy', 'Paste'].includes(entry.label)
    );

    expect(clipboardItems.map((entry) => entry.label)).toEqual(['Cut', 'Copy', 'Paste']);
    expect(clipboardItems.every((entry) => entry.disabled === false)).toBe(true);
  });

  it('offers Find in Folder for concrete folders but not the synthetic root', () => {
    expect(items(buildFolderEntries('enabled')).map(entry => entry.label)).toContain(
      'Find in Folder…',
    );
    expect(items(buildFolderEntries('enabled', '(root)')).map(entry => entry.label)).not.toContain(
      'Find in Folder…',
    );
  });

  it('hides file clipboard actions when folder mutations are hidden', () => {
    const labels = items(buildFolderEntries('hidden')).map((entry) => entry.label);

    expect(labels).not.toContain('Cut');
    expect(labels).not.toContain('Copy');
    expect(labels).not.toContain('Paste');
  });

  it('does not include folder destructive actions for the synthetic root folder', () => {
    const entries = buildFolderEntries('enabled', '(root)');
    const labels = items(entries).map((entry) => entry.label);

    expect(labels).toContain('New File');
    expect(labels).toContain('New Folder');
    expect(labels).not.toContain('Rename Folder');
    expect(labels).not.toContain('Delete Folder');
    expect(labels).toContain('Paste');
    expect(labels).not.toContain('Cut');
    expect(labels).not.toContain('Copy');
  });
});
