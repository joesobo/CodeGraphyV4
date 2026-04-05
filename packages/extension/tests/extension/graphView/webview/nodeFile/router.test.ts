import { describe, expect, it, vi } from 'vitest';
import {
  applyNodeFileMessage,
  type GraphViewNodeFileHandlers,
} from '../../../../../src/extension/graphView/webview/nodeFile/router';

function createHandlers(
  overrides: Partial<GraphViewNodeFileHandlers> = {},
): GraphViewNodeFileHandlers {
  return {
    timelineActive: false,
    currentCommitSha: undefined,
    setFocusedFile: vi.fn(),
    openSelectedNode: vi.fn(() => Promise.resolve()),
    activateNode: vi.fn(() => Promise.resolve()),
    previewFileAtCommit: vi.fn(() => Promise.resolve()),
    openFile: vi.fn(() => Promise.resolve()),
    revealInExplorer: vi.fn(() => Promise.resolve()),
    copyToClipboard: vi.fn(() => Promise.resolve()),
    deleteFiles: vi.fn(() => Promise.resolve()),
    renameFile: vi.fn(() => Promise.resolve()),
    createFile: vi.fn(() => Promise.resolve()),
    toggleFavorites: vi.fn(() => Promise.resolve()),
    addToExclude: vi.fn(() => Promise.resolve()),
    analyzeAndSendData: vi.fn(() => Promise.resolve()),
    getFileInfo: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

describe('graph view node/file router', () => {
  it('opens files at the current commit when timeline mode is active', async () => {
    const handlers = createHandlers({
      timelineActive: true,
      currentCommitSha: 'abc123',
    });

    await expect(
      applyNodeFileMessage(
        { type: 'OPEN_FILE', payload: { path: 'src/app.ts' } },
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.previewFileAtCommit).toHaveBeenCalledWith('abc123', 'src/app.ts');
    expect(handlers.openFile).not.toHaveBeenCalled();
  });

  it('skips destructive file edits while timeline mode is active', async () => {
    const handlers = createHandlers({
      timelineActive: true,
      currentCommitSha: 'abc123',
    });

    await expect(
      applyNodeFileMessage(
        { type: 'DELETE_FILES', payload: { paths: ['src/app.ts'] } },
        handlers,
      ),
    ).resolves.toBe(true);
    await expect(
      applyNodeFileMessage(
        { type: 'RENAME_FILE', payload: { path: 'src/app.ts' } },
        handlers,
      ),
    ).resolves.toBe(true);
    await expect(
      applyNodeFileMessage(
        { type: 'CREATE_FILE', payload: { directory: 'src' } },
        handlers,
      ),
    ).resolves.toBe(true);
    await expect(
      applyNodeFileMessage(
        { type: 'ADD_TO_EXCLUDE', payload: { patterns: ['dist/**'] } },
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.deleteFiles).not.toHaveBeenCalled();
    expect(handlers.renameFile).not.toHaveBeenCalled();
    expect(handlers.createFile).not.toHaveBeenCalled();
    expect(handlers.addToExclude).not.toHaveBeenCalled();
  });

  it('awaits graph refresh requests', async () => {
    const analyzeAndSendData = vi.fn(() => Promise.resolve());
    const handlers = createHandlers({ analyzeAndSendData });

    await expect(
      applyNodeFileMessage({ type: 'REFRESH_GRAPH' }, handlers),
    ).resolves.toBe(true);

    expect(analyzeAndSendData).toHaveBeenCalledTimes(1);
  });

  it('returns false for unrelated messages', async () => {
    const handlers = createHandlers();

    await expect(
      applyNodeFileMessage(
        { type: 'INDEX_REPO' },
        handlers,
      ),
    ).resolves.toBe(false);
  });
});
