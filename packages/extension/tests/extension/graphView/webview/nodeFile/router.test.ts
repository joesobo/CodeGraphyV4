import { describe, expect, it, vi } from 'vitest';
import {
  applyNodeFileMessage,
  type GraphViewNodeFileHandlers,
} from '../../../../../src/extension/graphView/webview/nodeFile/router';

function createHandlers(
  overrides: Partial<GraphViewNodeFileHandlers> = {},
): GraphViewNodeFileHandlers {
  return {
    setFocusedFile: vi.fn(),
    openSelectedNode: vi.fn(() => Promise.resolve()),
    activateNode: vi.fn(() => Promise.resolve()),
    openFile: vi.fn(() => Promise.resolve()),
    revealInExplorer: vi.fn(() => Promise.resolve()),
    copyToClipboard: vi.fn(() => Promise.resolve()),
    deleteFiles: vi.fn(() => Promise.resolve()),
    renameFile: vi.fn(() => Promise.resolve()),
    createFile: vi.fn(() => Promise.resolve()),
    createFolder: vi.fn(() => Promise.resolve()),
    toggleFavorites: vi.fn(() => Promise.resolve()),
    addToExclude: vi.fn(() => Promise.resolve()),
    indexGraph: vi.fn(() => Promise.resolve()),
    refreshGraph: vi.fn(() => Promise.resolve()),
    getFileInfo: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

describe('graph view node/file router', () => {
  it('awaits graph refresh requests', async () => {
    const refreshGraph = vi.fn(() => Promise.resolve());
    const handlers = createHandlers({ refreshGraph });

    await expect(
      applyNodeFileMessage({ type: 'REFRESH_GRAPH' }, handlers),
    ).resolves.toBe(true);

    expect(refreshGraph).toHaveBeenCalledTimes(1);
  });

  it('awaits graph index requests', async () => {
    const indexGraph = vi.fn(() => Promise.resolve());
    const handlers = createHandlers({ indexGraph });

    await expect(
      applyNodeFileMessage({ type: 'INDEX_GRAPH' }, handlers),
    ).resolves.toBe(true);

    expect(indexGraph).toHaveBeenCalledTimes(1);
  });

  it('returns false for unrelated messages', async () => {
    const handlers = createHandlers();

    await expect(
      applyNodeFileMessage(
        { type: 'EXPORT_SYMBOLS_JSON' },
        handlers,
      ),
    ).resolves.toBe(false);
  });
});
