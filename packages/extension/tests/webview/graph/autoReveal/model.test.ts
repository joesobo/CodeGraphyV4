import { describe, expect, it, vi } from 'vitest';
import { applyActiveFileAutoReveal } from '../../../../src/webview/components/graph/autoReveal/model';

describe('graph/autoReveal/model', () => {
  it('selects and pans to an active node when auto reveal is enabled', () => {
    const selectOnlyNode = vi.fn();
    const panToNodeById = vi.fn();

    applyActiveFileAutoReveal({
      filePath: 'src/app.ts',
      mode: true,
      nodeIds: new Set(['src/app.ts']),
      panToNodeById,
      selectOnlyNode,
    });

    expect(selectOnlyNode).toHaveBeenCalledWith('src/app.ts');
    expect(panToNodeById).toHaveBeenCalledWith('src/app.ts');
  });

  it('selects without panning in focusNoScroll mode', () => {
    const selectOnlyNode = vi.fn();
    const panToNodeById = vi.fn();

    applyActiveFileAutoReveal({
      filePath: 'src/app.ts',
      mode: 'focusNoScroll',
      nodeIds: new Set(['src/app.ts']),
      panToNodeById,
      selectOnlyNode,
    });

    expect(selectOnlyNode).toHaveBeenCalledWith('src/app.ts');
    expect(panToNodeById).not.toHaveBeenCalled();
  });

  it('does nothing when disabled or when the active file is not visible', () => {
    const selectOnlyNode = vi.fn();
    const panToNodeById = vi.fn();

    for (const mode of [false, true] as const) {
      applyActiveFileAutoReveal({
        filePath: 'src/missing.ts',
        mode,
        nodeIds: new Set(['src/app.ts']),
        panToNodeById,
        selectOnlyNode,
      });
    }

    expect(selectOnlyNode).not.toHaveBeenCalled();
    expect(panToNodeById).not.toHaveBeenCalled();
  });
});
