import { describe, expect, it, vi } from 'vitest';
import {
  applyNodeFileEditMessage,
  type GraphViewNodeFileEditHandlers,
} from '../../../../../src/extension/graphView/webview/nodeFile/edit';

function createHandlers(
  overrides: Partial<GraphViewNodeFileEditHandlers> = {},
): GraphViewNodeFileEditHandlers {
  return {
    timelineActive: false,
    deleteFiles: vi.fn(() => Promise.resolve()),
    renameFile: vi.fn(() => Promise.resolve()),
    createFile: vi.fn(() => Promise.resolve()),
    toggleFavorites: vi.fn(() => Promise.resolve()),
    addToExclude: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

describe('graph view node/file edit message', () => {
  it('deletes files outside timeline mode', async () => {
    const handlers = createHandlers();

    await expect(applyNodeFileEditMessage(
      { type: 'DELETE_FILES', payload: { paths: ['src/app.ts'] } },
      handlers,
    )).resolves.toBe(true);

    expect(handlers.deleteFiles).toHaveBeenCalledWith(['src/app.ts']);
  });

  it('skips deletes while timeline mode is active', async () => {
    const handlers = createHandlers({ timelineActive: true });

    await applyNodeFileEditMessage(
      { type: 'DELETE_FILES', payload: { paths: ['src/app.ts'] } },
      handlers,
    );

    expect(handlers.deleteFiles).not.toHaveBeenCalled();
  });

  it('renames files outside timeline mode', async () => {
    const handlers = createHandlers();

    await expect(applyNodeFileEditMessage(
      { type: 'RENAME_FILE', payload: { path: 'src/app.ts' } },
      handlers,
    )).resolves.toBe(true);

    expect(handlers.renameFile).toHaveBeenCalledWith('src/app.ts');
  });

  it('creates files outside timeline mode', async () => {
    const handlers = createHandlers();

    await expect(applyNodeFileEditMessage(
      { type: 'CREATE_FILE', payload: { directory: 'src' } },
      handlers,
    )).resolves.toBe(true);

    expect(handlers.createFile).toHaveBeenCalledWith('src');
  });

  it('toggles favorites even in timeline mode', async () => {
    const handlers = createHandlers({ timelineActive: true });

    await expect(applyNodeFileEditMessage(
      { type: 'TOGGLE_FAVORITE', payload: { paths: ['src/app.ts'] } },
      handlers,
    )).resolves.toBe(true);

    expect(handlers.toggleFavorites).toHaveBeenCalledWith(['src/app.ts']);
  });

  it('adds exclude patterns outside timeline mode', async () => {
    const handlers = createHandlers();

    await expect(applyNodeFileEditMessage(
      { type: 'ADD_TO_EXCLUDE', payload: { patterns: ['dist/**'] } },
      handlers,
    )).resolves.toBe(true);

    expect(handlers.addToExclude).toHaveBeenCalledWith(['dist/**']);
  });

  it('skips exclude updates while timeline mode is active', async () => {
    const handlers = createHandlers({ timelineActive: true });

    await applyNodeFileEditMessage(
      { type: 'ADD_TO_EXCLUDE', payload: { patterns: ['dist/**'] } },
      handlers,
    );

    expect(handlers.addToExclude).not.toHaveBeenCalled();
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
