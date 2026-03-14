import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { IGroup } from '../../../src/shared/types';
import {
  buildGraphViewGroupsUpdatedMessage,
  loadGraphViewGroupState,
} from '../../../src/extension/graphView/groups';

interface MockInspectResult<T> {
  workspaceValue?: T;
  globalValue?: T;
}

function createConfig(options?: {
  hiddenPluginGroups?: string[];
  inspected?: Record<string, MockInspectResult<unknown> | undefined>;
}) {
  const inspected = options?.inspected ?? {};
  const hiddenPluginGroups = options?.hiddenPluginGroups ?? [];

  return {
    get<T>(section: string, defaultValue: T): T {
      if (section === 'hiddenPluginGroups') {
        return hiddenPluginGroups as T;
      }

      return defaultValue;
    },
    inspect<T>(section: string): MockInspectResult<T> | undefined {
      return inspected[section] as MockInspectResult<T> | undefined;
    },
  };
}

function createWorkspaceState(values: Record<string, unknown>) {
  return {
    get<T>(key: string): T | undefined {
      return values[key] as T | undefined;
    },
  };
}

describe('graphView/groups', () => {
  it('prefers configured groups and filter patterns over legacy workspace state', () => {
    const configuredGroups: IGroup[] = [
      { id: 'configured', pattern: 'src/**', color: '#112233' },
    ];

    const state = loadGraphViewGroupState(
      createConfig({
        hiddenPluginGroups: ['plugin:codegraphy.typescript'],
        inspected: {
          groups: { workspaceValue: configuredGroups },
          filterPatterns: { globalValue: ['dist/**'] },
        },
      }),
      createWorkspaceState({
        'codegraphy.groups': [{ id: 'legacy', pattern: '**/*', color: '#000000' }],
        'codegraphy.filterPatterns': ['coverage/**'],
      }),
    );

    expect(state.userGroups).toEqual(configuredGroups);
    expect(state.filterPatterns).toEqual(['dist/**']);
    expect([...state.hiddenPluginGroupIds]).toEqual(['plugin:codegraphy.typescript']);
    expect(state.legacyGroupsToMigrate).toBeUndefined();
  });

  it('falls back to legacy groups, filters out plugin groups, and requests migration', () => {
    const state = loadGraphViewGroupState(
      createConfig(),
      createWorkspaceState({
        'codegraphy.groups': [
          { id: 'user', pattern: 'src/**', color: '#112233' },
          { id: 'plugin:codegraphy.python:*.py', pattern: '*.py', color: '#445566' },
        ],
        'codegraphy.filterPatterns': ['coverage/**'],
      }),
    );

    expect(state.userGroups).toEqual([
      { id: 'user', pattern: 'src/**', color: '#112233' },
    ]);
    expect(state.legacyGroupsToMigrate).toEqual([
      { id: 'user', pattern: 'src/**', color: '#112233' },
    ]);
    expect(state.filterPatterns).toEqual(['coverage/**']);
  });

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
