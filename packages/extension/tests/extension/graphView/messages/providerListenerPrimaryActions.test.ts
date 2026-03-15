import { describe, expect, it, vi } from 'vitest';
import {
  createGraphViewProviderMessagePrimaryActions,
} from '../../../../src/extension/graphView/messages/providerListenerPrimaryActions';

describe('graph view provider listener primary actions', () => {
  it('delegates provider actions and persists groups through configuration updates', async () => {
    const update = vi.fn(() => Promise.resolve());
    const source = {
      _openSelectedNode: vi.fn(() => Promise.resolve()),
      _activateNode: vi.fn(() => Promise.resolve()),
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
      _sendPhysicsSettings: vi.fn(),
      _updatePhysicsSetting: vi.fn(() => Promise.resolve()),
      _resetPhysicsSettings: vi.fn(() => Promise.resolve()),
      _computeMergedGroups: vi.fn(),
      _sendGroupsUpdated: vi.fn(),
      _sendMessage: vi.fn(),
      _applyViewTransform: vi.fn(),
      _smartRebuild: vi.fn(),
    };
    const dependencies = {
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

    const actions = createGraphViewProviderMessagePrimaryActions(
      source as never,
      dependencies as never,
    );
    const groups = [{ id: 'user:src', pattern: 'src/**', color: '#112233' }];

    await actions.openSelectedNode('src/app.ts');
    await actions.persistGroups(groups as never);
    actions.showInformationMessage('saved');
    actions.sendMessage({ type: 'PING' });

    expect(source._openSelectedNode).toHaveBeenCalledWith('src/app.ts');
    expect(update).toHaveBeenCalledWith('groups', groups, 'workspace');
    expect(dependencies.window.showInformationMessage).toHaveBeenCalledWith('saved');
    expect(source._sendMessage).toHaveBeenCalledWith({ type: 'PING' });
  });
});
