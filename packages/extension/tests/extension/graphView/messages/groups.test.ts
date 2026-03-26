import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { IGroup } from '../../../../src/shared/contracts';
import {
  applyGroupMessage,
  type GraphViewGroupMessageHandlers,
  type GraphViewGroupMessageState,
} from '../../../../src/extension/graphView/messages/groups';

function createState(
  overrides: Partial<GraphViewGroupMessageState> = {},
): GraphViewGroupMessageState {
  return {
    userGroups: [],
    ...overrides,
  };
}

function createHandlers(
  overrides: Partial<GraphViewGroupMessageHandlers> = {},
): GraphViewGroupMessageHandlers {
  return {
    workspaceFolder: { uri: vscode.Uri.file('/test/workspace') },
    persistGroups: vi.fn(() => Promise.resolve()),
    recomputeGroups: vi.fn(),
    sendGroupsUpdated: vi.fn(),
    showOpenDialog: vi.fn(() => Promise.resolve(undefined)),
    createDirectory: vi.fn(() => Promise.resolve()),
    copyFile: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

describe('graph view group message', () => {
  it('persists updated groups without transient webview fields', async () => {
    const incomingGroups: IGroup[] = [
      {
        id: 'user-group',
        pattern: 'src/**',
        color: '#112233',
        imagePath: '.codegraphy/assets/icon.png',
        imageUrl: 'webview://icon.png',
        isPluginDefault: true,
        pluginName: 'TypeScript',
      },
    ];
    const state = createState();
    const handlers = createHandlers();

    await expect(
      applyGroupMessage(
        { type: 'UPDATE_GROUPS', payload: { groups: incomingGroups } },
        state,
        handlers,
      ),
    ).resolves.toBe(true);

    expect(state.userGroups).toEqual([
      {
        id: 'user-group',
        pattern: 'src/**',
        color: '#112233',
        imagePath: '.codegraphy/assets/icon.png',
      },
    ]);
    expect(handlers.persistGroups).toHaveBeenCalledWith(state.userGroups);
    expect(handlers.recomputeGroups).toHaveBeenCalledOnce();
    expect(handlers.sendGroupsUpdated).toHaveBeenCalledOnce();
  });

  it('copies a selected image into workspace assets and updates the target group', async () => {
    const state = createState({
      userGroups: [{ id: 'user-group', pattern: 'src/**', color: '#112233' }],
    });
    const selectedUri = vscode.Uri.file('/tmp/python.svg');
    const handlers = createHandlers({
      showOpenDialog: vi.fn(() => Promise.resolve([selectedUri])),
    });

    await expect(
      applyGroupMessage(
        { type: 'PICK_GROUP_IMAGE', payload: { groupId: 'user-group' } },
        state,
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.showOpenDialog).toHaveBeenCalledWith({
      canSelectMany: false,
      filters: { Images: ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif', 'ico'] },
      openLabel: 'Select Image',
    });
    expect(handlers.createDirectory).toHaveBeenCalledWith(
      vscode.Uri.file('/test/workspace/.codegraphy/assets'),
    );
    expect(handlers.copyFile).toHaveBeenCalledWith(
      selectedUri,
      vscode.Uri.file('/test/workspace/.codegraphy/assets/python.svg'),
      { overwrite: true },
    );
    expect(state.userGroups[0]?.imagePath).toBe('.codegraphy/assets/python.svg');
    expect(handlers.persistGroups).toHaveBeenCalledWith(state.userGroups);
    expect(handlers.recomputeGroups).toHaveBeenCalledOnce();
    expect(handlers.sendGroupsUpdated).toHaveBeenCalledOnce();
  });

  it('continues when the assets directory already exists', async () => {
    const state = createState({
      userGroups: [{ id: 'user-group', pattern: 'src/**', color: '#112233' }],
    });
    const selectedUri = vscode.Uri.file('/tmp/python.svg');
    const handlers = createHandlers({
      showOpenDialog: vi.fn(() => Promise.resolve([selectedUri])),
      createDirectory: vi.fn(() => Promise.reject(new Error('exists'))),
    });

    await applyGroupMessage(
      { type: 'PICK_GROUP_IMAGE', payload: { groupId: 'user-group' } },
      state,
      handlers,
    );

    expect(handlers.copyFile).toHaveBeenCalledOnce();
  });

  it('stops image selection when there is no workspace folder', async () => {
    const state = createState({
      userGroups: [{ id: 'user-group', pattern: 'src/**', color: '#112233' }],
    });
    const selectedUri = vscode.Uri.file('/tmp/python.svg');
    const handlers = createHandlers({
      workspaceFolder: undefined,
      showOpenDialog: vi.fn(() => Promise.resolve([selectedUri])),
    });

    await applyGroupMessage(
      { type: 'PICK_GROUP_IMAGE', payload: { groupId: 'user-group' } },
      state,
      handlers,
    );

    expect(handlers.copyFile).not.toHaveBeenCalled();
    expect(handlers.persistGroups).not.toHaveBeenCalled();
  });

  it('stops image selection when the picker is cancelled', async () => {
    const state = createState({
      userGroups: [{ id: 'user-group', pattern: 'src/**', color: '#112233' }],
    });
    const handlers = createHandlers({
      showOpenDialog: vi.fn(() => Promise.resolve([])),
    });

    await applyGroupMessage(
      { type: 'PICK_GROUP_IMAGE', payload: { groupId: 'user-group' } },
      state,
      handlers,
    );

    expect(handlers.copyFile).not.toHaveBeenCalled();
    expect(handlers.persistGroups).not.toHaveBeenCalled();
  });

  it('does not persist image changes when the group does not exist', async () => {
    const state = createState();
    const selectedUri = vscode.Uri.file('/tmp/python.svg');
    const handlers = createHandlers({
      showOpenDialog: vi.fn(() => Promise.resolve([selectedUri])),
    });

    await applyGroupMessage(
      { type: 'PICK_GROUP_IMAGE', payload: { groupId: 'missing-group' } },
      state,
      handlers,
    );

    expect(handlers.copyFile).toHaveBeenCalledOnce();
    expect(handlers.persistGroups).not.toHaveBeenCalled();
    expect(handlers.recomputeGroups).not.toHaveBeenCalled();
  });

  it('updates only the matching group when multiple groups share the same state object', async () => {
    const state = createState({
      userGroups: [
        { id: 'user-group', pattern: 'src/**', color: '#112233' },
        { id: 'other-group', pattern: 'test/**', color: '#445566' },
      ],
    });
    const selectedUri = vscode.Uri.file('/tmp/python.svg');
    const handlers = createHandlers({
      showOpenDialog: vi.fn(() => Promise.resolve([selectedUri])),
    });

    await expect(
      applyGroupMessage(
        { type: 'PICK_GROUP_IMAGE', payload: { groupId: 'other-group' } },
        state,
        handlers,
      ),
    ).resolves.toBe(true);

    expect(state.userGroups).toEqual([
      { id: 'user-group', pattern: 'src/**', color: '#112233' },
      {
        id: 'other-group',
        pattern: 'test/**',
        color: '#445566',
        imagePath: '.codegraphy/assets/python.svg',
      },
    ]);
    expect(handlers.persistGroups).toHaveBeenCalledWith(state.userGroups);
  });

  it('returns false for unrelated messages', async () => {
    const state = createState();
    const handlers = createHandlers();

    await expect(
      applyGroupMessage(
        { type: 'UPDATE_SHOW_LABELS', payload: { showLabels: false } },
        state,
        handlers,
      ),
    ).resolves.toBe(false);
  });
});
