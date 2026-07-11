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
    canMutateGraphRevision: true,
    cutFiles: vi.fn(() => Promise.resolve()),
    copyFiles: vi.fn(() => Promise.resolve()),
    pasteFiles: vi.fn(() => Promise.resolve()),
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
  it('deletes files outside timeline mode', async () => {
    const handlers = createHandlers();

    await expect(applyNodeFileEditMessage(
      { type: 'DELETE_FILES', payload: { paths: ['src/app.ts'] } },
      handlers,
    )).resolves.toBe(true);

    expect(handlers.deleteFiles).toHaveBeenCalledWith(['src/app.ts']);
  });

  it('skips deletes when a timeline snapshot graph revision is not mutable', async () => {
    const handlers = createHandlers({
      timelineActive: true,
      canMutateGraphRevision: false,
    });

    await applyNodeFileEditMessage(
      { type: 'DELETE_FILES', payload: { paths: ['src/app.ts'] } },
      handlers,
    );

    expect(handlers.deleteFiles).not.toHaveBeenCalled();
  });

  it('deletes files when timeline mode is inactive even if revision mutability is false', async () => {
    const handlers = createHandlers({
      timelineActive: false,
      canMutateGraphRevision: false,
    });

    await applyNodeFileEditMessage(
      { type: 'DELETE_FILES', payload: { paths: ['src/app.ts'] } },
      handlers,
    );

    expect(handlers.deleteFiles).toHaveBeenCalledWith(['src/app.ts']);
  });

  it('renames files outside timeline mode', async () => {
    const handlers = createHandlers();

    await expect(applyNodeFileEditMessage(
      { type: 'RENAME_FILE', payload: { path: 'src/app.ts' } },
      handlers,
    )).resolves.toBe(true);

    expect(handlers.renameFile).toHaveBeenCalledWith('src/app.ts');
  });

  it('routes a committed inline rename name', async () => {
    const handlers = createHandlers();
    await applyNodeFileEditMessage(
      { type: 'RENAME_FILE', payload: { path: 'src/app.ts', newName: 'main.ts' } },
      handlers,
    );
    expect(handlers.renameFile).toHaveBeenCalledWith('src/app.ts', 'main.ts');
  });

  it('routes validated cut, copy, and paste messages', async () => {
    const handlers = createHandlers();

    await applyNodeFileEditMessage(
      { type: 'CUT_FILES', payload: { paths: ['src/a.ts', 'src/b.ts'] } },
      handlers,
    );
    await applyNodeFileEditMessage(
      { type: 'COPY_FILES', payload: { paths: ['src/a.ts'] } },
      handlers,
    );
    await applyNodeFileEditMessage(
      { type: 'PASTE_FILES', payload: { directory: 'dest' } },
      handlers,
    );

    expect(handlers.cutFiles).toHaveBeenCalledWith(['src/a.ts', 'src/b.ts']);
    expect(handlers.copyFiles).toHaveBeenCalledWith(['src/a.ts']);
    expect(handlers.pasteFiles).toHaveBeenCalledWith('dest');
  });

  it('consumes malformed clipboard messages without invoking host actions', async () => {
    const handlers = createHandlers();

    const handled = await applyNodeFileEditMessage(
      { type: 'COPY_FILES', payload: { paths: [] } },
      handlers,
    );

    expect(handled).toBe(true);
    expect(handlers.copyFiles).not.toHaveBeenCalled();
  });

  it('blocks file clipboard actions for an immutable Graph Revision', async () => {
    const handlers = createHandlers({ timelineActive: true, canMutateGraphRevision: false });

    await applyNodeFileEditMessage(
      { type: 'CUT_FILES', payload: { paths: ['src/a.ts'] } },
      handlers,
    );

    expect(handlers.cutFiles).not.toHaveBeenCalled();
  });

  it('creates files outside timeline mode', async () => {
    const handlers = createHandlers();

    await expect(applyNodeFileEditMessage(
      { type: 'CREATE_FILE', payload: { directory: 'src' } },
      handlers,
    )).resolves.toBe(true);

    expect(handlers.createFile).toHaveBeenCalledWith('src');
  });

  it('routes a committed inline file name', async () => {
    const handlers = createHandlers();
    await applyNodeFileEditMessage(
      { type: 'CREATE_FILE', payload: { directory: 'src', name: 'feature/view.tsx' } },
      handlers,
    );
    expect(handlers.createFile).toHaveBeenCalledWith('src', 'feature/view.tsx');
  });

  it('creates files from the workspace root context', async () => {
    const handlers = createHandlers();

    await expect(applyNodeFileEditMessage(
      { type: 'CREATE_FILE', payload: { directory: '.' } },
      handlers,
    )).resolves.toBe(true);

    expect(handlers.createFile).toHaveBeenCalledWith('.');
  });

  it('creates folders outside timeline mode', async () => {
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

  it('creates folders in timeline mode when the graph revision is mutable', async () => {
    const handlers = createHandlers({
      timelineActive: true,
      canMutateGraphRevision: true,
    });

    await expect(applyNodeFileEditMessage(
      { type: 'CREATE_FOLDER', payload: { directory: 'src' } },
      handlers,
    )).resolves.toBe(true);

    expect(handlers.createFolder).toHaveBeenCalledWith('src');
  });

  it('toggles favorites even in timeline mode', async () => {
    let resolveToggle: (() => void) | undefined;
    const toggleComplete = new Promise<void>(resolve => {
      resolveToggle = resolve;
    });
    const handlers = createHandlers({
      timelineActive: true,
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

  it('adds exclude patterns outside timeline mode', async () => {
    const handlers = createHandlers();

    await expect(applyNodeFileEditMessage(
      { type: 'ADD_TO_EXCLUDE', payload: { patterns: ['dist/**'] } },
      handlers,
    )).resolves.toBe(true);

    expect(handlers.addToExclude).toHaveBeenCalledWith(['dist/**']);
  });

  it('skips exclude updates when the graph revision is not mutable', async () => {
    const handlers = createHandlers({
      timelineActive: true,
      canMutateGraphRevision: false,
    });

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
