import * as vscode from 'vscode';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createActions,
  createDependencies,
  createSource,
} from './primaryActions.fixture';

describe('graph view provider primary action delegation', () => {
  afterEach(() => { vi.restoreAllMocks(); });
  it('delegates file-oriented provider actions', async () => {
    const source = createSource();
    const actions = createActions(source);

    await actions.openSelectedNode('src/app.ts');
    await actions.activateNode('src/app.ts');
    actions.setFocusedFile('src/app.ts');
    await actions.openFile('src/app.ts');
    await actions.revealInExplorer('src/app.ts');
    await actions.copyToClipboard('src/app.ts');
    await actions.deleteFiles(['src/app.ts']);
    await actions.renameFile('src/app.ts');
    await actions.createFile('src');
    await actions.createFolder('src');
    await actions.toggleFavorites(['src/app.ts']);
    await actions.addToExclude(['dist/**']);
    await actions.getFileInfo('src/app.ts');

    expect(source._openSelectedNode).toHaveBeenCalledWith('src/app.ts');
    expect(source._activateNode).toHaveBeenCalledWith('src/app.ts');
    expect(source.setFocusedFile).toHaveBeenCalledWith('src/app.ts');
    expect(source._openFile).toHaveBeenCalledWith('src/app.ts');
    expect(source._revealInExplorer).toHaveBeenCalledWith('src/app.ts');
    expect(source._copyToClipboard).toHaveBeenCalledWith('src/app.ts');
    expect(source._deleteFiles).toHaveBeenCalledWith(['src/app.ts']);
    expect(source._renameFile).toHaveBeenCalledWith('src/app.ts');
    expect(source._createFile).toHaveBeenCalledWith('src');
    expect(source._createFolder).toHaveBeenCalledWith('src');
    expect(source._toggleFavorites).toHaveBeenCalledWith(['src/app.ts']);
    expect(source._addToExclude).toHaveBeenCalledWith(['dist/**']);
    expect(source._getFileInfo).toHaveBeenCalledWith('src/app.ts');
  });

  it('maps the synthetic root folder node to the workspace root for creation actions', async () => {
    const source = createSource();
    const actions = createActions(source);

    await actions.createFile('(root)');
    await actions.createFolder('(root)');

    expect(source._createFile).toHaveBeenCalledWith('.');
    expect(source._createFolder).toHaveBeenCalledWith('.');
  });

  it('delegates provider state actions', async () => {
    const source = createSource();
    const actions = createActions(source);

    await actions.loadAndSendData();
    await actions.indexAndSendData();
    await actions.analyzeAndSendData();
    await actions.refreshIndex();
    await actions.clearCacheAndRefresh();
    await actions.undo();
    await actions.redo();
    await actions.setDepthMode(true);
    await actions.setDepthLimit(4);
    actions.sendPhysicsSettings();
    await actions.updatePhysicsSetting('damping', 300);
    await actions.resetPhysicsSettings();

    expect(source._loadAndSendData).toHaveBeenCalledOnce();
    expect(source._indexAndSendData).toHaveBeenCalledOnce();
    expect(source._analyzeAndSendData).toHaveBeenCalledOnce();
    expect(source.refreshIndex).toHaveBeenCalledOnce();
    expect(source.clearCacheAndRefresh).toHaveBeenCalledOnce();
    expect(source.undo).toHaveBeenCalledOnce();
    expect(source.redo).toHaveBeenCalledOnce();
    expect(source.setDepthMode).toHaveBeenCalledWith(true);
    expect(source.setDepthLimit).toHaveBeenCalledWith(4);
    expect(source._sendPhysicsSettings).toHaveBeenCalledOnce();
    expect(source._updatePhysicsSetting).toHaveBeenCalledWith('damping', 300);
    expect(source._resetPhysicsSettings).toHaveBeenCalledOnce();
  });

  it('delegates opening in the existing editor surface', async () => {
    const source = createSource();
    const actions = createActions(source);

    await actions.openInEditor();

    expect(source._webviewMethods.openInEditor).toHaveBeenCalledOnce();
  });

  it('uses vscode file system wrappers for directory and file copies', async () => {
    const source = createSource();
    const actions = createActions(source);
    const originalFs = (vscode.workspace as { fs?: unknown }).fs;
    const createDirectory = vi.fn(() => Promise.resolve());
    const writeFile = vi.fn(() => Promise.resolve());
    const copy = vi.fn(() => Promise.resolve());
    const directoryUri = vscode.Uri.file('/workspace/assets');
    const sourceUri = vscode.Uri.file('/workspace/src/app.ts');
    const destinationUri = vscode.Uri.file('/workspace/src/app-copy.ts');
    const content = new Uint8Array([1, 2, 3]);

    Object.defineProperty(vscode.workspace, 'fs', {
      configurable: true,
      value: {
        createDirectory,
        writeFile,
        copy,
      },
    });

    await actions.createDirectory(directoryUri);
    await actions.writeFile(destinationUri, content);
    await actions.copyFile(sourceUri, destinationUri, { overwrite: true });

    expect(createDirectory).toHaveBeenCalledWith(directoryUri);
    expect(writeFile).toHaveBeenCalledWith(destinationUri, content);
    expect(copy).toHaveBeenCalledWith(sourceUri, destinationUri, { overwrite: true });

    Object.defineProperty(vscode.workspace, 'fs', {
      configurable: true,
      value: originalFs,
    });
  });

  it('delegates provider messaging, grouping, and view actions', () => {
    const source = createSource();
    const actions = createActions(source);
    const message = { type: 'PING' };

    actions.recomputeGroups();
    actions.sendGroupsUpdated();
    actions.sendMessage(message as never);
    actions.applyViewTransform();
    actions.smartRebuild('plugin.test');

    expect(source._computeMergedGroups).toHaveBeenCalledOnce();
    expect(source._sendGroupsUpdated).toHaveBeenCalledOnce();
    expect(source._sendMessage).toHaveBeenCalledWith(message);
    expect(source._applyViewTransform).toHaveBeenCalledOnce();
    expect(source._smartRebuild).toHaveBeenCalledWith('plugin.test');
  });


  it('falls back to vscode warning messages when dependencies do not provide one', async () => {
    const source = createSource();
    const dependencies = createDependencies();
    const originalShowWarningMessage = vscode.window.showWarningMessage;
    const fallback = vi.fn(() => Promise.resolve('Delete'));

    delete (dependencies.window as { showWarningMessage?: unknown }).showWarningMessage;
    Object.defineProperty(vscode.window, 'showWarningMessage', {
      configurable: true,
      value: fallback,
    });

    const result = await createActions(source, dependencies).showWarningMessage(
      'Delete file?',
      { modal: true },
      'Delete',
    );

    expect(result).toBe('Delete');
    expect(fallback).toHaveBeenCalledWith('Delete file?', { modal: true }, 'Delete');

    Object.defineProperty(vscode.window, 'showWarningMessage', {
      configurable: true,
      value: originalShowWarningMessage,
    });
  });
});
