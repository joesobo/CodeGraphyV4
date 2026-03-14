import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { buildGraphViewGroupsUpdatedMessage } from '../../../src/extension/graphView/groupMessage';

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
});
