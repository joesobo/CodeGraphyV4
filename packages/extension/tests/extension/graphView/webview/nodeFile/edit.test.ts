import { describe, expect, it, vi } from 'vitest';
import {
  applyNodeFileEditMessage,
  type GraphViewNodeFileEditHandlers,
} from '../../../../../src/extension/graphView/webview/nodeFile/edit';

function createHandlers(
  overrides: Partial<GraphViewNodeFileEditHandlers> = {},
): GraphViewNodeFileEditHandlers {
  return {
    deleteFiles: vi.fn(() => Promise.resolve()),
    renameFile: vi.fn(() => Promise.resolve()),
    createFile: vi.fn(() => Promise.resolve()),
    createFolder: vi.fn(() => Promise.resolve()),
    toggleFavorites: vi.fn(() => Promise.resolve()),
    addToExclude: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

describe('graph view node/file edit message', () => {

  it('creates files from the workspace root context', async () => {
    const handlers = createHandlers();

    await expect(applyNodeFileEditMessage(
      { type: 'CREATE_FILE', payload: { directory: '.' } },
      handlers,
    )).resolves.toBe(true);

    expect(handlers.createFile).toHaveBeenCalledWith('.');
  });

  it('creates folders from nested folder-node contexts', async () => {
    const handlers = createHandlers();

    await expect(applyNodeFileEditMessage(
      { type: 'CREATE_FOLDER', payload: { directory: 'src/features' } },
      handlers,
    )).resolves.toBe(true);

    expect(handlers.createFolder).toHaveBeenCalledWith('src/features');
  });

  it('returns false for unrelated messages', async () => {
    const handlers = createHandlers();

    const handled = await applyNodeFileEditMessage(
      { type: 'GET_FILE_INFO', payload: { path: 'src/app.ts' } },
      handlers,
    );

    expect(handled).toBe(false);
  });
});
