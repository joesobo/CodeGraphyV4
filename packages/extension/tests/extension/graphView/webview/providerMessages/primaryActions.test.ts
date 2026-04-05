import * as vscode from 'vscode';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createGraphViewProviderMessagePrimaryActions,
} from '../../../../../src/extension/graphView/webview/providerMessages/primaryActions';

describe('graph view provider listener primary actions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delegates file-oriented provider actions', async () => {
    const source = createSource();
    const actions = createActions(source);

    await actions.openSelectedNode('src/app.ts');
    await actions.activateNode('src/app.ts');
    actions.setFocusedFile('src/app.ts');
    await actions.previewFileAtCommit('sha-1', 'src/app.ts');
    await actions.openFile('src/app.ts');
    await actions.revealInExplorer('src/app.ts');
    await actions.copyToClipboard('src/app.ts');
    await actions.deleteFiles(['src/app.ts']);
    await actions.renameFile('src/app.ts');
    await actions.createFile('src');
    await actions.toggleFavorites(['src/app.ts']);
    await actions.addToExclude(['dist/**']);
    await actions.getFileInfo('src/app.ts');

    expect(source._openSelectedNode).toHaveBeenCalledWith('src/app.ts');
    expect(source._activateNode).toHaveBeenCalledWith('src/app.ts');
    expect(source.setFocusedFile).toHaveBeenCalledWith('src/app.ts');
    expect(source._previewFileAtCommit).toHaveBeenCalledWith('sha-1', 'src/app.ts');
    expect(source._openFile).toHaveBeenCalledWith('src/app.ts');
    expect(source._revealInExplorer).toHaveBeenCalledWith('src/app.ts');
    expect(source._copyToClipboard).toHaveBeenCalledWith('src/app.ts');
    expect(source._deleteFiles).toHaveBeenCalledWith(['src/app.ts']);
    expect(source._renameFile).toHaveBeenCalledWith('src/app.ts');
    expect(source._createFile).toHaveBeenCalledWith('src');
    expect(source._toggleFavorites).toHaveBeenCalledWith(['src/app.ts']);
    expect(source._addToExclude).toHaveBeenCalledWith(['dist/**']);
    expect(source._getFileInfo).toHaveBeenCalledWith('src/app.ts');
  });

  it('delegates provider state and timeline actions', async () => {
    const source = createSource();
    const actions = createActions(source);

    await actions.analyzeAndSendData();
    await actions.undo();
    await actions.redo();
    await actions.changeView('codegraphy.depth-graph');
    await actions.setDepthLimit(4);
    await actions.indexRepository();
    await actions.jumpToCommit('sha-1');
    await actions.resetTimeline();
    actions.sendPhysicsSettings();
    await actions.updatePhysicsSetting('damping', 300);
    await actions.resetPhysicsSettings();

    expect(source._analyzeAndSendData).toHaveBeenCalledOnce();
    expect(source.undo).toHaveBeenCalledOnce();
    expect(source.redo).toHaveBeenCalledOnce();
    expect(source.changeView).toHaveBeenCalledWith('codegraphy.depth-graph');
    expect(source.setDepthLimit).toHaveBeenCalledWith(4);
    expect(source._indexRepository).toHaveBeenCalledOnce();
    expect(source._jumpToCommit).toHaveBeenCalledWith('sha-1');
    expect(source._resetTimeline).toHaveBeenCalledOnce();
    expect(source._sendPhysicsSettings).toHaveBeenCalledOnce();
    expect(source._updatePhysicsSetting).toHaveBeenCalledWith('damping', 300);
    expect(source._resetPhysicsSettings).toHaveBeenCalledOnce();
  });

  it('uses dependency-backed wrappers for group persistence and dialogs', async () => {
    const source = createSource();
    const dependencies = createDependencies();
    const actions = createActions(source, dependencies);
    const groups = [{ id: 'user:src', pattern: 'src/**', color: '#112233' }];
    const openDialogOptions = { canSelectFiles: true };

    await actions.persistGroups(groups as never);
    actions.showInformationMessage('saved');
    await actions.showOpenDialog(openDialogOptions as never);

    expect(dependencies.getConfigTarget).toHaveBeenCalledWith(
      dependencies.workspace.workspaceFolders,
    );
    expect(dependencies.workspace.getConfiguration).toHaveBeenCalledWith('codegraphy');
    expect(dependencies.update).toHaveBeenCalledWith('groups', groups, 'workspace');
    expect(dependencies.window.showInformationMessage).toHaveBeenCalledWith('saved');
    expect(dependencies.window.showOpenDialog).toHaveBeenCalledWith(openDialogOptions);
  });

  it('uses vscode file system wrappers for directory and file copies', async () => {
    const source = createSource();
    const actions = createActions(source);
    const originalFs = (vscode.workspace as { fs?: unknown }).fs;
    const createDirectory = vi.fn(() => Promise.resolve());
    const copy = vi.fn(() => Promise.resolve());
    const directoryUri = vscode.Uri.file('/workspace/assets');
    const sourceUri = vscode.Uri.file('/workspace/src/app.ts');
    const destinationUri = vscode.Uri.file('/workspace/src/app-copy.ts');

    Object.defineProperty(vscode.workspace, 'fs', {
      configurable: true,
      value: {
        createDirectory,
        copy,
      },
    });

    await actions.createDirectory(directoryUri);
    await actions.copyFile(sourceUri, destinationUri, { overwrite: true });

    expect(createDirectory).toHaveBeenCalledWith(directoryUri);
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
    actions.smartRebuild('plugin', 'plugin.test');

    expect(source._computeMergedGroups).toHaveBeenCalledOnce();
    expect(source._sendGroupsUpdated).toHaveBeenCalledOnce();
    expect(source._sendMessage).toHaveBeenCalledWith(message);
    expect(source._applyViewTransform).toHaveBeenCalledOnce();
    expect(source._smartRebuild).toHaveBeenCalledWith('plugin', 'plugin.test');
  });
});

function createSource() {
  return {
    _openSelectedNode: vi.fn(() => Promise.resolve()),
    _activateNode: vi.fn(() => Promise.resolve()),
    setFocusedFile: vi.fn(),
    _previewFileAtCommit: vi.fn(() => Promise.resolve()),
    _openFile: vi.fn(() => Promise.resolve()),
    _revealInExplorer: vi.fn(() => Promise.resolve()),
    _copyToClipboard: vi.fn(() => Promise.resolve()),
    _deleteFiles: vi.fn(() => Promise.resolve()),
    _renameFile: vi.fn(() => Promise.resolve()),
    _createFile: vi.fn(() => Promise.resolve()),
    _toggleFavorites: vi.fn(() => Promise.resolve()),
    _addToExclude: vi.fn(() => Promise.resolve()),
    _analyzeAndSendData: vi.fn(() => Promise.resolve()),
    _getFileInfo: vi.fn(() => Promise.resolve()),
    undo: vi.fn(() => Promise.resolve('undo')),
    redo: vi.fn(() => Promise.resolve('redo')),
    changeView: vi.fn(() => Promise.resolve()),
    setDepthLimit: vi.fn(() => Promise.resolve()),
    _indexRepository: vi.fn(() => Promise.resolve()),
    _jumpToCommit: vi.fn(() => Promise.resolve()),
    _resetTimeline: vi.fn(() => Promise.resolve()),
    _sendPhysicsSettings: vi.fn(),
    _updatePhysicsSetting: vi.fn(() => Promise.resolve()),
    _resetPhysicsSettings: vi.fn(() => Promise.resolve()),
    _computeMergedGroups: vi.fn(),
    _sendGroupsUpdated: vi.fn(),
    _sendMessage: vi.fn(),
    _applyViewTransform: vi.fn(),
    _smartRebuild: vi.fn(),
  };
}

function createDependencies() {
  const update = vi.fn(() => Promise.resolve());

  return {
    update,
    workspace: {
      workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
      getConfiguration: vi.fn(() => ({ update })),
    },
    window: {
      showInformationMessage: vi.fn(),
      showOpenDialog: vi.fn(() => Promise.resolve(undefined)),
    },
    getConfigTarget: vi.fn(() => 'workspace'),
  };
}

function createActions(
  source = createSource(),
  dependencies = createDependencies(),
) {
  return createGraphViewProviderMessagePrimaryActions(source as never, dependencies as never);
}
