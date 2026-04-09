import { describe, expect, it, vi } from 'vitest';
import { applyCommandMessage } from '../../../../../src/extension/graphView/webview/messages/commands';

function createHandlers() {
  return {
    undo: vi.fn(),
    redo: vi.fn(),
    showInformationMessage: vi.fn(),
    changeView: vi.fn(() => Promise.resolve()),
    setDepthMode: vi.fn(() => Promise.resolve()),
    setDepthLimit: vi.fn(() => Promise.resolve()),
    updateDagMode: vi.fn(() => Promise.resolve()),
    updateNodeSizeMode: vi.fn(() => Promise.resolve()),
  };
}

describe('graph view command message', () => {
  it('shows the undo description when one exists', async () => {
    const handlers = createHandlers();
    handlers.undo.mockResolvedValue('Rename file');

    const handled = await applyCommandMessage({ type: 'UNDO' }, handlers);

    expect(handlers.undo).toHaveBeenCalledOnce();
    expect(handlers.showInformationMessage).toHaveBeenCalledWith('Undo: Rename file');
    expect(handled).toBe(true);
  });

  it('shows an empty-undo message when there is nothing to undo', async () => {
    const handlers = createHandlers();
    handlers.undo.mockResolvedValue(undefined);

    await applyCommandMessage({ type: 'UNDO' }, handlers);

    expect(handlers.showInformationMessage).toHaveBeenCalledWith('Nothing to undo');
  });

  it('shows the redo description when one exists', async () => {
    const handlers = createHandlers();
    handlers.redo.mockResolvedValue('Delete file');

    const handled = await applyCommandMessage({ type: 'REDO' }, handlers);

    expect(handlers.redo).toHaveBeenCalledOnce();
    expect(handlers.showInformationMessage).toHaveBeenCalledWith('Redo: Delete file');
    expect(handled).toBe(true);
  });

  it('shows an empty-redo message when there is nothing to redo', async () => {
    const handlers = createHandlers();
    handlers.redo.mockResolvedValue(undefined);

    const handled = await applyCommandMessage({ type: 'REDO' }, handlers);

    expect(handlers.showInformationMessage).toHaveBeenCalledWith('Nothing to redo');
    expect(handled).toBe(true);
  });

  it('changes the active view', async () => {
    const handlers = createHandlers();

    const handled = await applyCommandMessage(
      { type: 'CHANGE_VIEW', payload: { viewId: 'codegraphy.folder' } },
      handlers,
    );

    expect(handlers.changeView).toHaveBeenCalledWith('codegraphy.folder');
    expect(handled).toBe(true);
  });

  it('changes the depth limit', async () => {
    const handlers = createHandlers();

    const handled = await applyCommandMessage(
      { type: 'CHANGE_DEPTH_LIMIT', payload: { depthLimit: 2 } },
      handlers,
    );

    expect(handlers.setDepthLimit).toHaveBeenCalledWith(2);
    expect(handled).toBe(true);
  });

  it('updates depth mode', async () => {
    const handlers = createHandlers();

    const handled = await applyCommandMessage(
      { type: 'UPDATE_DEPTH_MODE', payload: { depthMode: true } },
      handlers,
    );

    expect(handlers.setDepthMode).toHaveBeenCalledWith(true);
    expect(handled).toBe(true);
  });

  it('updates dag mode', async () => {
    const handlers = createHandlers();

    const handled = await applyCommandMessage(
      { type: 'UPDATE_DAG_MODE', payload: { dagMode: 'td' } },
      handlers,
    );

    expect(handlers.updateDagMode).toHaveBeenCalledWith('td');
    expect(handled).toBe(true);
  });

  it('updates node size mode', async () => {
    const handlers = createHandlers();

    const handled = await applyCommandMessage(
      { type: 'UPDATE_NODE_SIZE_MODE', payload: { nodeSizeMode: 'uniform' } },
      handlers,
    );

    expect(handlers.updateNodeSizeMode).toHaveBeenCalledWith('uniform');
    expect(handled).toBe(true);
  });

  it('returns false for unrelated messages', async () => {
    const handlers = createHandlers();

    const handled = await applyCommandMessage(
      { type: 'GET_FILE_INFO', payload: { path: 'src/app.ts' } },
      handlers,
    );

    expect(handled).toBe(false);
  });
});
