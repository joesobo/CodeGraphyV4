import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { buildGraphViewGroupsUpdatedMessage } from '../../../../src/extension/graphView/groups/message';

describe('graphView/groupMessage', () => {
  it('resolves plugin asset paths from plugin-backed group ids', () => {
    const resolvePluginAssetPath = vi.fn(() => 'webview://plugin/python.svg');

    const message = buildGraphViewGroupsUpdatedMessage(
      [{ id: 'plugin:codegraphy.python:*.py', pattern: '*.py', color: '#112233', imagePath: 'icons/python.svg' }],
      {
        resolvePluginAssetPath,
      },
    );

    expect(resolvePluginAssetPath).toHaveBeenCalledWith('icons/python.svg', 'codegraphy.python');
    expect(message).toEqual({
      type: 'GROUPS_UPDATED',
      payload: {
        groups: [
          {
            id: 'plugin:codegraphy.python:*.py',
            pattern: '*.py',
            color: '#112233',
            imagePath: 'icons/python.svg',
            imageUrl: 'webview://plugin/python.svg',
          },
        ],
      },
    });
  });

  it('resolves inherited plugin asset paths from user group image metadata', () => {
    const resolvePluginAssetPath = vi.fn(() => 'webview://plugin/python.svg');

    const message = buildGraphViewGroupsUpdatedMessage(
      [
        {
          id: 'user-group',
          pattern: '*.py',
          color: '#112233',
          imagePath: 'plugin:codegraphy.python:icons/python.svg',
        },
      ],
      {
        resolvePluginAssetPath,
      },
    );

    expect(resolvePluginAssetPath).toHaveBeenCalledWith('icons/python.svg', 'codegraphy.python');
    expect(message.payload.groups[0]?.imageUrl).toBe('webview://plugin/python.svg');
  });

  it('resolves workspace-relative asset paths through the active webview', () => {
    const asWebviewUri = vi.fn((uri: vscode.Uri) => ({
      toString: () => `webview:${uri.fsPath}`,
    }));

    const message = buildGraphViewGroupsUpdatedMessage(
      [{ id: 'user-group', pattern: '*.png', color: '#112233', imagePath: '.codegraphy/assets/icon.png' }],
      {
        workspaceFolder: { uri: vscode.Uri.file('/test/workspace') },
        asWebviewUri,
        resolvePluginAssetPath: vi.fn(),
      },
    );

    expect(asWebviewUri).toHaveBeenCalledWith(
      vscode.Uri.file('/test/workspace/.codegraphy/assets/icon.png'),
    );
    expect(message.payload.groups[0]?.imageUrl).toBe(
      'webview:/test/workspace/.codegraphy/assets/icon.png',
    );
  });

  it('leaves groups without image metadata unchanged', () => {
    const group = { id: 'user-group', pattern: '*.png', color: '#112233' };

    const message = buildGraphViewGroupsUpdatedMessage([group], {
      resolvePluginAssetPath: vi.fn(),
    });

    expect(message.payload.groups).toEqual([group]);
  });

  it('omits image urls when there is no workspace webview context', () => {
    const message = buildGraphViewGroupsUpdatedMessage(
      [{ id: 'user-group', pattern: '*.png', color: '#112233', imagePath: '.codegraphy/assets/icon.png' }],
      {
        workspaceFolder: { uri: vscode.Uri.file('/test/workspace') },
        resolvePluginAssetPath: vi.fn(),
      },
    );

    expect(message.payload.groups[0]).toEqual({
      id: 'user-group',
      pattern: '*.png',
      color: '#112233',
      imagePath: '.codegraphy/assets/icon.png',
    });
  });

  it('omits plugin image urls when plugin asset resolution fails', () => {
    const resolvePluginAssetPath = vi.fn(() => undefined);

    const message = buildGraphViewGroupsUpdatedMessage(
      [{ id: 'plugin:codegraphy.python:*.py', pattern: '*.py', color: '#112233', imagePath: 'icons/python.svg' }],
      {
        resolvePluginAssetPath,
      },
    );

    expect(resolvePluginAssetPath).toHaveBeenCalledWith('icons/python.svg', 'codegraphy.python');
    expect(message.payload.groups[0]).toEqual({
      id: 'plugin:codegraphy.python:*.py',
      pattern: '*.py',
      color: '#112233',
      imagePath: 'icons/python.svg',
    });
  });

  it('does not treat non-plugin group ids as plugin-backed groups', () => {
    const resolvePluginAssetPath = vi.fn(() => 'webview://plugin/python.svg');
    const asWebviewUri = vi.fn((uri: vscode.Uri) => ({
      toString: () => `webview:${uri.fsPath}`,
    }));

    const message = buildGraphViewGroupsUpdatedMessage(
      [
        {
          id: 'user-plugin:codegraphy.python:*.py',
          pattern: '*.py',
          color: '#112233',
          imagePath: '.codegraphy/assets/icon.png',
        },
      ],
      {
        workspaceFolder: { uri: vscode.Uri.file('/test/workspace') },
        asWebviewUri,
        resolvePluginAssetPath,
      },
    );

    expect(resolvePluginAssetPath).not.toHaveBeenCalled();
    expect(asWebviewUri).toHaveBeenCalledWith(
      vscode.Uri.file('/test/workspace/.codegraphy/assets/icon.png'),
    );
    expect(message.payload.groups[0]?.imageUrl).toBe(
      'webview:/test/workspace/.codegraphy/assets/icon.png',
    );
  });

  it('does not inherit plugin assets when the image metadata is not anchored', () => {
    const resolvePluginAssetPath = vi.fn(() => 'webview://plugin/python.svg');
    const asWebviewUri = vi.fn((uri: vscode.Uri) => ({
      toString: () => `webview:${uri.fsPath}`,
    }));

    const message = buildGraphViewGroupsUpdatedMessage(
      [
        {
          id: 'user-group',
          pattern: '*.py',
          color: '#112233',
          imagePath: 'icons/plugin:codegraphy.python:python.svg',
        },
      ],
      {
        workspaceFolder: { uri: vscode.Uri.file('/test/workspace') },
        asWebviewUri,
        resolvePluginAssetPath,
      },
    );

    expect(resolvePluginAssetPath).not.toHaveBeenCalled();
    expect(asWebviewUri).toHaveBeenCalledWith(
      vscode.Uri.file('/test/workspace/icons/plugin:codegraphy.python:python.svg'),
    );
    expect(message.payload.groups[0]?.imageUrl).toBe(
      'webview:/test/workspace/icons/plugin:codegraphy.python:python.svg',
    );
  });
});
