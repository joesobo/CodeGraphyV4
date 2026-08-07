import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PANE_LAYOUT,
  PANE_LAYOUT_STORAGE_KEY,
  clampPaneLayout,
  parsePaneLayout,
  readPaneLayout,
} from './paneLayout';

describe('desktop pane layout', () => {
  it('parses one exact finite interface record', () => {
    expect(parsePaneLayout({ files: 0.2, editor: 0.4 })).toEqual({ files: 0.2, editor: 0.4 });
    expect(parsePaneLayout({ files: 0.2, editor: 0.4, extra: true })).toEqual(DEFAULT_PANE_LAYOUT);
    expect(parsePaneLayout({ files: Number.NaN, editor: 0.4 })).toEqual(DEFAULT_PANE_LAYOUT);
  });

  it('restores defaults for missing or malformed local data', () => {
    expect(readPaneLayout({ getItem: () => null })).toEqual(DEFAULT_PANE_LAYOUT);
    expect(readPaneLayout({ getItem: key => key === PANE_LAYOUT_STORAGE_KEY ? '{bad' : null }))
      .toEqual(DEFAULT_PANE_LAYOUT);
  });

  it('clamps every pane to a usable width as the window changes', () => {
    expect(clampPaneLayout({ files: 0.9, editor: 0.09 }, 1_040)).toEqual({
      files: 388,
      editor: 320,
      graph: 320,
    });
    const wide = clampPaneLayout({ files: 0.16, editor: 0.45 }, 1_440);
    expect(wide.files).toBeGreaterThanOrEqual(180);
    expect(wide.editor).toBeGreaterThanOrEqual(320);
    expect(wide.graph).toBeGreaterThanOrEqual(320);
    expect(wide.files + wide.editor + wide.graph).toBe(1_428);
  });
});
