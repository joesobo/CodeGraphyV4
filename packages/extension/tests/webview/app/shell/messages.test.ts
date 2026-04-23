import { describe, expect, it } from 'vitest';
import { getNoDataHint } from '../../../../src/webview/app/shell/messages';

describe('app messages', () => {
  it('prompts to enable show orphans when graph data exists but orphans are hidden', () => {
    expect(
      getNoDataHint({ nodes: [], edges: [] }, false),
    ).toBe('All files are hidden. Try enabling "Show Orphans" in Settings → Filters.');
  });

  it('prompts to open a folder when no graph data is available', () => {
    expect(getNoDataHint(null, false)).toBe('Open a folder to visualize its structure.');
  });

  it('prompts to open a folder when show orphans is enabled', () => {
    expect(getNoDataHint({ nodes: [], edges: [] }, true)).toBe(
      'Open a folder to visualize its structure.',
    );
  });

  it('prompts to try another commit when the timeline commit has no graphable files', () => {
    expect(getNoDataHint({ nodes: [], edges: [] }, true, false, true)).toBe(
      'No graphable files exist in this commit. Try another point in the timeline.',
    );
  });

  it('prompts to change depth focus when depth mode resolves to an empty graph', () => {
    expect(getNoDataHint({ nodes: [], edges: [] }, true, true)).toBe(
      'No nodes match the current depth focus. Try changing the focused file or disabling depth mode.',
    );
  });
});
