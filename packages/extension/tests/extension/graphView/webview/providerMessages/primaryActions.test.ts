import * as vscode from 'vscode';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createGraphViewProviderMessagePrimaryActions,
} from '../../../../../src/extension/graphView/webview/providerMessages/primaryActions';
import * as repoSettings from '../../../../../src/extension/repoSettings/current';

vi.mock('../../../../../src/extension/repoSettings/current', () => ({
  getCodeGraphyConfiguration: vi.fn(),
  updateCodeGraphyConfigurationSilently: vi.fn(() => Promise.resolve()),
}));

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

    await actions.loadAndSendData();
    await actions.indexAndSendData();
    await actions.analyzeAndSendData();
    await actions.refreshIndex();
    await actions.clearCacheAndRefresh();
    await actions.undo();
    await actions.redo();
    await actions.setDepthMode(true);
    await actions.setDepthLimit(4);
    await actions.indexRepository();
    await actions.jumpToCommit('sha-1');
    await actions.resetTimeline();
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
    const updateSilently = vi.fn(() => Promise.resolve());
    vi.mocked(dependencies.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((key: string, defaultValue: unknown) =>
        key === 'legendVisibility'
          ? {
              existing: true,
            }
          : defaultValue,
      ),
    } as never);
    vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue({
      get: vi.fn((_key: string, defaultValue: unknown) => defaultValue),
      update: vi.fn(() => Promise.resolve()),
    } as never);
    vi.mocked(repoSettings.updateCodeGraphyConfigurationSilently).mockImplementation(updateSilently);
    const actions = createActions(source, dependencies);
    const groups = [{ id: 'user:src', pattern: 'src/**', color: '#112233' }];
    const openDialogOptions = { canSelectFiles: true };

    await actions.persistLegends(groups as never);
    await actions.persistDefaultLegendVisibility('plugin:codegraphy.typescript:*.ts', false);
    await actions.persistLegendOrder(['plugin:codegraphy.typescript:*.ts', 'legend:user']);
    actions.showInformationMessage('saved');
    await actions.showOpenDialog(openDialogOptions as never);

    expect(updateSilently).toHaveBeenCalledWith('legend', groups);
    expect(updateSilently).toHaveBeenCalledWith('legendVisibility', {
      'plugin:codegraphy.typescript:*.ts': false,
    });
    expect(updateSilently).toHaveBeenCalledWith('legendOrder', [
      'plugin:codegraphy.typescript:*.ts',
      'legend:user',
    ]);
    expect(dependencies.window.showInformationMessage).toHaveBeenCalledWith('saved');
    expect(dependencies.window.showOpenDialog).toHaveBeenCalledWith(openDialogOptions);
  });

  it('merges repeated default-legend visibility updates against the current codegraphy config', async () => {
    const source = createSource();
    const dependencies = createDependencies();
    const updateSilently = vi.fn(async (key: string, value: unknown) => {
      if (key === 'legendVisibility') {
        legendVisibility = value as Record<string, boolean>;
      }
    });
    let legendVisibility: Record<string, boolean> = {};

    vi.mocked(dependencies.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((_key: string, defaultValue: unknown) => defaultValue),
    } as never);
    vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue({
      get: vi.fn(<T>(key: string, defaultValue: T): T => (
        key === 'legendVisibility'
          ? (legendVisibility as T)
          : defaultValue
      )),
      update: vi.fn(() => Promise.resolve()),
    } as never);
    vi.mocked(repoSettings.updateCodeGraphyConfigurationSilently).mockImplementation(updateSilently);

    const actions = createActions(source, dependencies);

    await actions.persistDefaultLegendVisibility('default:fileExtension:ts', false);
    await actions.persistDefaultLegendVisibility('default:fileExtension:js', false);

    expect(updateSilently).toHaveBeenNthCalledWith(1, 'legendVisibility', {
      'default:fileExtension:ts': false,
    });
    expect(updateSilently).toHaveBeenNthCalledWith(2, 'legendVisibility', {
      'default:fileExtension:ts': false,
      'default:fileExtension:js': false,
    });
  });

  it('merges batched default-legend visibility updates against the current codegraphy config', async () => {
    const source = createSource();
    const dependencies = createDependencies();
    const updateSilently = vi.fn(async (key: string, value: unknown) => {
      if (key === 'legendVisibility') {
        legendVisibility = value as Record<string, boolean>;
      }
    });
    let legendVisibility: Record<string, boolean> = { existing: true };

    vi.mocked(dependencies.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((_key: string, defaultValue: unknown) => defaultValue),
    } as never);
    vi.mocked(repoSettings.getCodeGraphyConfiguration).mockReturnValue({
      get: vi.fn(<T>(key: string, defaultValue: T): T => (
        key === 'legendVisibility'
          ? (legendVisibility as T)
          : defaultValue
      )),
      update: vi.fn(() => Promise.resolve()),
    } as never);
    vi.mocked(repoSettings.updateCodeGraphyConfigurationSilently).mockImplementation(updateSilently);

    const actions = createActions(source, dependencies);

    await actions.persistDefaultLegendVisibilityBatch({
      'default:fileExtension:ts': false,
      'default:fileExtension:js': false,
    });

    expect(updateSilently).toHaveBeenCalledWith('legendVisibility', {
      existing: true,
      'default:fileExtension:ts': false,
      'default:fileExtension:js': false,
    });
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
    actions.smartRebuild('plugin.test');

    expect(source._computeMergedGroups).toHaveBeenCalledOnce();
    expect(source._sendGroupsUpdated).toHaveBeenCalledOnce();
    expect(source._sendMessage).toHaveBeenCalledWith(message);
    expect(source._applyViewTransform).toHaveBeenCalledOnce();
    expect(source._smartRebuild).toHaveBeenCalledWith('plugin.test');
  });

  it('allows opening concrete file nodes and blocks explicit folder or package nodes', () => {
    const source = createSource({
      _graphData: {
        nodes: [
          { id: 'src/app.ts', nodeType: 'file' },
          { id: 'src', nodeType: 'folder' },
          { id: 'pkg:react', nodeType: 'package' },
        ],
        edges: [],
      },
    });
    const actions = createActions(source);

    expect(actions.canOpenPath('src/app.ts')).toBe(true);
    expect(actions.canOpenPath('src')).toBe(false);
    expect(actions.canOpenPath('pkg:react')).toBe(false);
  });

  it('blocks inferred root and nested folder paths when no explicit node exists', () => {
    const source = createSource({
      _graphData: {
        nodes: [
          { id: 'README.md', nodeType: 'file' },
          { id: 'src/app.ts', nodeType: 'file' },
        ],
        edges: [],
      },
    });
    const actions = createActions(source);

    expect(actions.canOpenPath('(root)')).toBe(false);
    expect(actions.canOpenPath('src')).toBe(false);
    expect(actions.canOpenPath('docs')).toBe(true);
  });
});

function createSource(overrides: Record<string, unknown> = {}) {
  return {
    _openSelectedNode: vi.fn(() => Promise.resolve()),
    _activateNode: vi.fn(() => Promise.resolve()),
    setFocusedFile: vi.fn(),
    _previewFileAtCommit: vi.fn(() => Promise.resolve()),
    _openFile: vi.fn(() => Promise.resolve()),
    _webviewMethods: {
      openInEditor: vi.fn(() => Promise.resolve()),
    },
    _revealInExplorer: vi.fn(() => Promise.resolve()),
    _copyToClipboard: vi.fn(() => Promise.resolve()),
    _deleteFiles: vi.fn(() => Promise.resolve()),
    _renameFile: vi.fn(() => Promise.resolve()),
    _createFile: vi.fn(() => Promise.resolve()),
    _toggleFavorites: vi.fn(() => Promise.resolve()),
    _addToExclude: vi.fn(() => Promise.resolve()),
    _loadAndSendData: vi.fn(() => Promise.resolve()),
    _indexAndSendData: vi.fn(() => Promise.resolve()),
    _analyzeAndSendData: vi.fn(() => Promise.resolve()),
    refreshIndex: vi.fn(() => Promise.resolve()),
    clearCacheAndRefresh: vi.fn(() => Promise.resolve()),
    _getFileInfo: vi.fn(() => Promise.resolve()),
    undo: vi.fn(() => Promise.resolve('undo')),
    redo: vi.fn(() => Promise.resolve('redo')),
    setDepthMode: vi.fn(() => Promise.resolve()),
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
    _graphData: { nodes: [], edges: [] },
    ...overrides,
  };
}

function createDependencies() {
  return {
    workspace: {
      workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
      getConfiguration: vi.fn(() => ({
        get: vi.fn((_key: string, defaultValue: unknown) => defaultValue),
      })),
    },
    window: {
      showInformationMessage: vi.fn(),
      showOpenDialog: vi.fn(() => Promise.resolve(undefined)),
    },
    getConfigTarget: vi.fn(),
  };
}

function createActions(
  source = createSource(),
  dependencies = createDependencies(),
) {
  return createGraphViewProviderMessagePrimaryActions(source as never, dependencies as never);
}
