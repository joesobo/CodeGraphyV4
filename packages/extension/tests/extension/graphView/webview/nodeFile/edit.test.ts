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
  it('deletes files', async () => {
    const handlers = createHandlers();

    await expect(applyNodeFileEditMessage(
      { type: 'DELETE_FILES', payload: { paths: ['src/app.ts'] } },
      handlers,
    )).resolves.toBe(true);

    expect(handlers.deleteFiles).toHaveBeenCalledWith(['src/app.ts']);
  });

  it('renames files', async () => {
    const handlers = createHandlers();

    await expect(applyNodeFileEditMessage(
      { type: 'RENAME_FILE', payload: { path: 'src/app.ts' } },
      handlers,
    )).resolves.toBe(true);

    expect(handlers.renameFile).toHaveBeenCalledWith('src/app.ts');
  });

  it('creates files', async () => {
    const handlers = createHandlers();

    await expect(applyNodeFileEditMessage(
      { type: 'CREATE_FILE', payload: { directory: 'src' } },
      handlers,
    )).resolves.toBe(true);

    expect(handlers.createFile).toHaveBeenCalledWith('src');
  });

  it('creates files from the workspace root context', async () => {
    const handlers = createHandlers();

    await expect(applyNodeFileEditMessage(
      { type: 'CREATE_FILE', payload: { directory: '.' } },
      handlers,
    )).resolves.toBe(true);

    expect(handlers.createFile).toHaveBeenCalledWith('.');
  });

  it('creates folders', async () => {
    const handlers = createHandlers();

    await expect(applyNodeFileEditMessage(
      { type: 'CREATE_FOLDER', payload: { directory: 'src' } },
      handlers,
    )).resolves.toBe(true);

    expect(handlers.createFolder).toHaveBeenCalledWith('src');
  });

  it('creates folders from nested folder-node contexts', async () => {
    const handlers = createHandlers();

    await expect(applyNodeFileEditMessage(
      { type: 'CREATE_FOLDER', payload: { directory: 'src/features' } },
      handlers,
    )).resolves.toBe(true);

    expect(handlers.createFolder).toHaveBeenCalledWith('src/features');
  });

  it('awaits favorite updates', async () => {
    let resolveToggle: (() => void) | undefined;
    const toggleComplete = new Promise<void>(resolve => {
      resolveToggle = resolve;
    });
    const handlers = createHandlers({
      toggleFavorites: vi.fn(() => toggleComplete),
    });

    let resolved = false;
    const handled = applyNodeFileEditMessage(
      { type: 'TOGGLE_FAVORITE', payload: { paths: ['src/app.ts'] } },
      handlers,
    ).then((result) => {
      resolved = true;
      return result;
    });

    await new Promise(resolve => setTimeout(resolve, 0));
    expect(resolved).toBe(false);

    resolveToggle?.();
    await expect(handled).resolves.toBe(true);

    expect(handlers.toggleFavorites).toHaveBeenCalledWith(['src/app.ts']);
  });

  it('adds exclude patterns', async () => {
    const handlers = createHandlers();

    await expect(applyNodeFileEditMessage(
      { type: 'ADD_TO_EXCLUDE', payload: { patterns: ['dist/**'] } },
      handlers,
    )).resolves.toBe(true);

    expect(handlers.addToExclude).toHaveBeenCalledWith(['dist/**']);
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
