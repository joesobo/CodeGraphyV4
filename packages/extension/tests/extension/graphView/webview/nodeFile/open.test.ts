import { describe, expect, it, vi } from 'vitest';
import {
  applyNodeFileOpenMessage,
  type GraphViewNodeFileOpenHandlers,
} from '../../../../../src/extension/graphView/webview/nodeFile/open';

function createHandlers(
  overrides: Partial<GraphViewNodeFileOpenHandlers> = {},
): GraphViewNodeFileOpenHandlers {
  return {
    timelineActive: false,
    currentCommitSha: undefined,
    setFocusedFile: vi.fn(),
    openSelectedNode: vi.fn(() => Promise.resolve()),
    activateNode: vi.fn(() => Promise.resolve()),
    previewFileAtCommit: vi.fn(() => Promise.resolve()),
    openFile: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

describe('graph view node/file open message', () => {
  it('opens the selected node temporarily', async () => {
    const handlers = createHandlers();

    const handled = await applyNodeFileOpenMessage(
      { type: 'NODE_SELECTED', payload: { nodeId: 'src/app.ts' } },
      handlers,
    );

    expect(handled).toBe(true);
    expect(handlers.setFocusedFile).toHaveBeenCalledWith('src/app.ts');
    expect(handlers.openSelectedNode).toHaveBeenCalledWith('src/app.ts');
  });

  it('activates the node on double click', async () => {
    const handlers = createHandlers();

    await applyNodeFileOpenMessage(
      { type: 'NODE_DOUBLE_CLICKED', payload: { nodeId: 'src/app.ts' } },
      handlers,
    );

    expect(handlers.activateNode).toHaveBeenCalledWith('src/app.ts');
  });

  it('previews the current commit when timeline mode is active', async () => {
    const handlers = createHandlers({
      timelineActive: true,
      currentCommitSha: 'abc123',
    });

    await applyNodeFileOpenMessage(
      { type: 'OPEN_FILE', payload: { path: 'src/app.ts' } },
      handlers,
    );

    expect(handlers.setFocusedFile).toHaveBeenCalledWith('src/app.ts');
    expect(handlers.previewFileAtCommit).toHaveBeenCalledWith('abc123', 'src/app.ts');
    expect(handlers.openFile).not.toHaveBeenCalled();
  });

  it('opens files directly when commit preview is unavailable', async () => {
    const handlers = createHandlers({
      timelineActive: true,
      currentCommitSha: undefined,
    });

    await applyNodeFileOpenMessage(
      { type: 'OPEN_FILE', payload: { path: 'src/app.ts' } },
      handlers,
    );

    expect(handlers.setFocusedFile).toHaveBeenCalledWith('src/app.ts');
    expect(handlers.openFile).toHaveBeenCalledWith('src/app.ts');
    expect(handlers.previewFileAtCommit).not.toHaveBeenCalled();
  });

  it('returns false for unrelated messages', async () => {
    const handlers = createHandlers();

    const handled = await applyNodeFileOpenMessage(
      { type: 'DELETE_FILES', payload: { paths: ['src/app.ts'] } },
      handlers,
    );

    expect(handled).toBe(false);
  });
});
