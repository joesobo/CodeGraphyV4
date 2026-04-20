import { describe, it, expect } from 'vitest';
import {
  buildOpenBlock,
  buildCopyBlock,
} from '../../../../src/webview/components/graph/contextMenu/node/openCopyBlocks';
import {
  buildFavoriteBlock,
} from '../../../../src/webview/components/graph/contextMenu/node/destructive/favoritesBlocks';
import {
  buildFilterBlock,
  buildDestructiveBlock,
} from '../../../../src/webview/components/graph/contextMenu/node/destructive/block';
import type { GraphContextMenuEntry } from '../../../../src/webview/components/graph/contextMenu/contracts';

function itemLabels(entries: GraphContextMenuEntry[]): string[] {
  return entries.filter(entry => entry.kind === 'item').map(entry => (entry as Extract<GraphContextMenuEntry, { kind: 'item' }>).label);
}

describe('graph/contextMenu/node/openCopyBlocks', () => {
  describe('buildOpenBlock', () => {
    it('shows "Open File" for a single target', () => {
      const labels = itemLabels(buildOpenBlock(['src/app.ts'], false));
      expect(labels).toContain('Open File');
    });

    it('shows "Open N Files" for multiple targets', () => {
      const labels = itemLabels(buildOpenBlock(['src/a.ts', 'src/b.ts'], false));
      expect(labels).toContain('Open 2 Files');
    });

    it('includes "Reveal in Explorer" for single target outside timeline', () => {
      const labels = itemLabels(buildOpenBlock(['src/app.ts'], false));
      expect(labels).toContain('Reveal in Explorer');
    });

    it('omits "Reveal in Explorer" when timeline is active', () => {
      const labels = itemLabels(buildOpenBlock(['src/app.ts'], true));
      expect(labels).not.toContain('Reveal in Explorer');
    });

    it('omits "Reveal in Explorer" for multi-select', () => {
      const labels = itemLabels(buildOpenBlock(['src/a.ts', 'src/b.ts'], false));
      expect(labels).not.toContain('Reveal in Explorer');
    });
  });

  describe('buildCopyBlock', () => {
    it('includes both relative and absolute path copy for single target', () => {
      const labels = itemLabels(buildCopyBlock(['src/app.ts']));
      expect(labels).toContain('Copy Relative Path');
      expect(labels).toContain('Copy Absolute Path');
    });

    it('shows plural label and omits absolute path copy for multi-select', () => {
      const labels = itemLabels(buildCopyBlock(['src/a.ts', 'src/b.ts']));
      expect(labels).toContain('Copy Relative Paths');
      expect(labels).not.toContain('Copy Absolute Path');
    });
  });

  describe('buildFavoriteBlock', () => {
    it('shows "Add to Favorites" when target is not favorited', () => {
      const labels = itemLabels(buildFavoriteBlock(['src/app.ts'], new Set()));
      expect(labels).toContain('Add to Favorites');
    });

    it('shows "Remove from Favorites" when single target is favorited', () => {
      const labels = itemLabels(buildFavoriteBlock(['src/app.ts'], new Set(['src/app.ts'])));
      expect(labels).toContain('Remove from Favorites');
    });

    it('shows "Add All to Favorites" when not all multi-targets are favorited', () => {
      const labels = itemLabels(buildFavoriteBlock(['src/a.ts', 'src/b.ts'], new Set(['src/a.ts'])));
      expect(labels).toContain('Add All to Favorites');
    });

    it('shows "Remove All from Favorites" when all multi-targets are favorited', () => {
      const labels = itemLabels(buildFavoriteBlock(['src/a.ts', 'src/b.ts'], new Set(['src/a.ts', 'src/b.ts'])));
      expect(labels).toContain('Remove All from Favorites');
    });

    it('includes "Focus Node" for single target', () => {
      const labels = itemLabels(buildFavoriteBlock(['src/app.ts'], new Set()));
      expect(labels).toContain('Focus Node');
    });

    it('omits "Focus Node" for multi-select', () => {
      const labels = itemLabels(buildFavoriteBlock(['src/a.ts', 'src/b.ts'], new Set()));
      expect(labels).not.toContain('Focus Node');
    });
  });

  describe('buildFilterBlock', () => {
    it('includes Add to Filter for single target', () => {
      const labels = itemLabels(buildFilterBlock(['src/app.ts']));
      expect(labels).toContain('Add to Filter');
      expect(labels).toContain('Add Legend Group');
    });

    it('shows Add All to Filter and omits Add Legend Group for multi-select', () => {
      const labels = itemLabels(buildFilterBlock(['src/a.ts', 'src/b.ts']));
      expect(labels).toContain('Add All to Filter');
      expect(labels).not.toContain('Add Legend Group');
    });
  });

  describe('buildDestructiveBlock', () => {
    it('includes Rename and Delete for single target', () => {
      const labels = itemLabels(buildDestructiveBlock(['src/app.ts']));
      expect(labels).toContain('Rename...');
      expect(labels).toContain('Delete File');
    });

    it('shows plural labels and omits Rename for multi-select', () => {
      const labels = itemLabels(buildDestructiveBlock(['src/a.ts', 'src/b.ts']));
      expect(labels).toContain('Delete 2 Files');
      expect(labels).not.toContain('Rename...');
    });

    it('marks the delete entry as destructive', () => {
      const entries = buildDestructiveBlock(['src/app.ts']);
      const deleteEntry = entries.find(
        entry => entry.kind === 'item' && (entry as Extract<GraphContextMenuEntry, { kind: 'item' }>).label === 'Delete File'
      ) as Extract<GraphContextMenuEntry, { kind: 'item' }> | undefined;
      expect(deleteEntry?.destructive).toBe(true);
    });
  });
});
