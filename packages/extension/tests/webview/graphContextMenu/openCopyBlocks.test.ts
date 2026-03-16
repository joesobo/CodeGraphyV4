import { describe, it, expect } from 'vitest';
import {
  buildOpenBlock,
  buildCopyBlock,
} from '../../../src/webview/components/graphContextMenu/openCopyBlocks';
import type { GraphContextMenuEntry } from '../../../src/webview/components/graphContextMenu/types';

function itemLabels(entries: GraphContextMenuEntry[]): string[] {
  return entries
    .filter(entry => entry.kind === 'item')
    .map(entry => (entry as Extract<GraphContextMenuEntry, { kind: 'item' }>).label);
}

function findItem(entries: GraphContextMenuEntry[], label: string) {
  return entries.find(
    e => e.kind === 'item' && (e as Extract<GraphContextMenuEntry, { kind: 'item' }>).label === label
  ) as Extract<GraphContextMenuEntry, { kind: 'item' }> | undefined;
}

describe('buildOpenBlock', () => {
  it('shows Open File for single target', () => {
    const labels = itemLabels(buildOpenBlock(['a.ts'], false));
    expect(labels).toContain('Open File');
  });

  it('shows Open N Files for multiple targets', () => {
    const labels = itemLabels(buildOpenBlock(['a.ts', 'b.ts', 'c.ts'], false));
    expect(labels).toContain('Open 3 Files');
  });

  it('includes Reveal in Explorer for single target outside timeline', () => {
    const labels = itemLabels(buildOpenBlock(['a.ts'], false));
    expect(labels).toContain('Reveal in Explorer');
  });

  it('omits Reveal in Explorer when timeline is active', () => {
    const labels = itemLabels(buildOpenBlock(['a.ts'], true));
    expect(labels).not.toContain('Reveal in Explorer');
  });

  it('omits Reveal in Explorer for multi-select', () => {
    const labels = itemLabels(buildOpenBlock(['a.ts', 'b.ts'], false));
    expect(labels).not.toContain('Reveal in Explorer');
  });

  it('uses correct action for Open File', () => {
    const entries = buildOpenBlock(['a.ts'], false);
    const openEntry = findItem(entries, 'Open File');
    expect(openEntry?.action).toMatchObject({ kind: 'builtin', action: 'open' });
  });

  it('uses correct action for Reveal in Explorer', () => {
    const entries = buildOpenBlock(['a.ts'], false);
    const revealEntry = findItem(entries, 'Reveal in Explorer');
    expect(revealEntry?.action).toMatchObject({ kind: 'builtin', action: 'reveal' });
  });
});

describe('buildCopyBlock', () => {
  it('starts with a separator', () => {
    const entries = buildCopyBlock(['a.ts']);
    expect(entries[0].kind).toBe('separator');
    expect(entries[0].id).toBe('node-separator-copy');
  });

  it('includes Copy Relative Path for single target', () => {
    const labels = itemLabels(buildCopyBlock(['a.ts']));
    expect(labels).toContain('Copy Relative Path');
  });

  it('includes Copy Absolute Path for single target', () => {
    const labels = itemLabels(buildCopyBlock(['a.ts']));
    expect(labels).toContain('Copy Absolute Path');
  });

  it('shows Copy Relative Paths for multi-select', () => {
    const labels = itemLabels(buildCopyBlock(['a.ts', 'b.ts']));
    expect(labels).toContain('Copy Relative Paths');
  });

  it('omits Copy Absolute Path for multi-select', () => {
    const labels = itemLabels(buildCopyBlock(['a.ts', 'b.ts']));
    expect(labels).not.toContain('Copy Absolute Path');
  });

  it('uses correct action for Copy Relative Path', () => {
    const entries = buildCopyBlock(['a.ts']);
    const relativeEntry = findItem(entries, 'Copy Relative Path');
    expect(relativeEntry?.action).toMatchObject({ kind: 'builtin', action: 'copyRelative' });
  });

  it('uses correct action for Copy Absolute Path', () => {
    const entries = buildCopyBlock(['a.ts']);
    const absoluteEntry = findItem(entries, 'Copy Absolute Path');
    expect(absoluteEntry?.action).toMatchObject({ kind: 'builtin', action: 'copyAbsolute' });
  });
});
