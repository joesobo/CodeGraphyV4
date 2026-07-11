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
    canOpenPath: vi.fn(() => true),
    setFocusedFile: vi.fn(),
    openSelectedNode: vi.fn(() => Promise.resolve()),
    activateNode: vi.fn(() => Promise.resolve()),
    previewFileAtCommit: vi.fn(() => Promise.resolve()),
    openFile: vi.fn(() => Promise.resolve()),
    openFileToSide: vi.fn(() => Promise.resolve()),
    findInFolder: vi.fn(() => Promise.resolve()),
    closeFileEditor: vi.fn(() => Promise.resolve()),
    openFileWith: vi.fn(() => Promise.resolve()),
    openInTerminal: vi.fn(() => Promise.resolve()),
    compareFiles: vi.fn(() => Promise.resolve()),
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

  it('clears the focused file without opening another node', async () => {
    const handlers = createHandlers();

    const handled = await applyNodeFileOpenMessage(
      { type: 'CLEAR_FOCUSED_FILE' },
      handlers,
    );

    expect(handled).toBe(true);
    expect(handlers.setFocusedFile).toHaveBeenCalledWith(undefined);
    expect(handlers.openSelectedNode).not.toHaveBeenCalled();
    expect(handlers.activateNode).not.toHaveBeenCalled();
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

  it('opens every requested workspace file to the side', async () => {
    const handlers = createHandlers({
      canOpenPath: vi.fn((path: string) => path !== 'src'),
    });

    await applyNodeFileOpenMessage(
      { type: 'OPEN_FILES_TO_SIDE', payload: { paths: ['src/a.ts', 'src', 'src/b.ts'] } },
      handlers,
    );

    expect(handlers.openFileToSide).toHaveBeenNthCalledWith(1, 'src/a.ts');
    expect(handlers.openFileToSide).toHaveBeenNthCalledWith(2, 'src/b.ts');
  });

  it('routes Find in Folder requests', async () => {
    const handlers = createHandlers();

    await applyNodeFileOpenMessage(
      { type: 'FIND_IN_FOLDER', payload: { path: 'src' } },
      handlers,
    );

    expect(handlers.findInFolder).toHaveBeenCalledWith('src');
  });

  it('routes Close Editor requests', async () => {
    const handlers = createHandlers();

    await applyNodeFileOpenMessage(
      { type: 'CLOSE_FILE_EDITOR', payload: { path: 'src/app.ts' } },
      handlers,
    );

    expect(handlers.closeFileEditor).toHaveBeenCalledWith('src/app.ts');
  });

  it('routes Open With requests', async () => {
    const handlers = createHandlers();

    await applyNodeFileOpenMessage(
      { type: 'OPEN_FILE_WITH', payload: { path: 'src/app.ts' } },
      handlers,
    );

    expect(handlers.openFileWith).toHaveBeenCalledWith('src/app.ts');
  });

  it('routes integrated terminal requests', async () => {
    const handlers = createHandlers();

    await applyNodeFileOpenMessage(
      { type: 'OPEN_IN_TERMINAL', payload: { path: 'src' } },
      handlers,
    );

    expect(handlers.openInTerminal).toHaveBeenCalledWith('src');
  });

  it('routes compare-file requests', async () => {
    const handlers = createHandlers();

    const handled = await applyNodeFileOpenMessage(
      {
        type: 'COMPARE_FILES',
        payload: { leftPath: 'src/app.ts', rightPath: 'src/next.ts' },
      },
      handlers,
    );

    expect(handled).toBe(true);
    expect(handlers.compareFiles).toHaveBeenCalledWith('src/app.ts', 'src/next.ts');
  });

  it('returns false for unrelated messages', async () => {
    const handlers = createHandlers();

    const handled = await applyNodeFileOpenMessage(
      { type: 'DELETE_FILES', payload: { paths: ['src/app.ts'] } },
      handlers,
    );

    expect(handled).toBe(false);
  });

  it('ignores folder nodes for preview and activation', async () => {
    const handlers = createHandlers({
      canOpenPath: vi.fn(() => false),
    });

    await applyNodeFileOpenMessage(
      { type: 'NODE_SELECTED', payload: { nodeId: 'src' } },
      handlers,
    );
    await applyNodeFileOpenMessage(
      { type: 'NODE_DOUBLE_CLICKED', payload: { nodeId: 'src' } },
      handlers,
    );

    expect(handlers.setFocusedFile).toHaveBeenCalledWith(undefined);
    expect(handlers.openSelectedNode).not.toHaveBeenCalled();
    expect(handlers.activateNode).not.toHaveBeenCalled();
  });

  it('ignores package and folder open requests', async () => {
    const handlers = createHandlers({
      canOpenPath: vi.fn((path: string) => path === 'src/app.ts'),
    });

    await applyNodeFileOpenMessage(
      { type: 'OPEN_FILE', payload: { path: 'pkg:react' } },
      handlers,
    );
    await applyNodeFileOpenMessage(
      { type: 'OPEN_FILE', payload: { path: 'src' } },
      handlers,
    );

    expect(handlers.openFile).not.toHaveBeenCalled();
    expect(handlers.previewFileAtCommit).not.toHaveBeenCalled();
    expect(handlers.setFocusedFile).toHaveBeenCalledWith(undefined);
  });
});
