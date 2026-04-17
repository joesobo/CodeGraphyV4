import * as vscode from 'vscode';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { IGroup } from '../../../../src/shared/settings/groups';

const {
  getConfigValue,
  registerBuiltInPluginRoots,
  getPluginDefaultGroups,
  getBuiltInDefaultGroups,
  buildMergedGroups,
  resolvePluginAssetPath,
  getWebviewResourceRoots,
  refreshWebviewResourceRoots,
  normalizeExtensionUri,
} = vi.hoisted(() => ({
  getConfigValue: vi.fn(),
  registerBuiltInPluginRoots: vi.fn(),
  getPluginDefaultGroups: vi.fn(() => [] as IGroup[]),
  getBuiltInDefaultGroups: vi.fn(() => [] as IGroup[]),
  buildMergedGroups: vi.fn(() => [] as IGroup[]),
  resolvePluginAssetPath: vi.fn(() => ''),
  getWebviewResourceRoots: vi.fn(() => [] as vscode.Uri[]),
  refreshWebviewResourceRoots: vi.fn(),
  normalizeExtensionUri: vi.fn((uri: vscode.Uri | string | undefined) => (
    typeof uri === 'string' ? vscode.Uri.file(uri) : uri
  )),
}));

vi.mock('../../../../src/extension/repoSettings/current', () => ({
  getCodeGraphyConfiguration: () => ({
    get: getConfigValue,
  }),
}));

vi.mock('../../../../src/extension/graphView/groups/defaults/builtIn', () => ({
  getBuiltInGraphViewDefaultGroups: getBuiltInDefaultGroups,
}));

vi.mock('../../../../src/extension/graphView/groups/defaults/plugin', () => ({
  getGraphViewPluginDefaultGroups: getPluginDefaultGroups,
}));

vi.mock('../../../../src/extension/graphView/groups/defaults/pluginRoots', () => ({
  registerBuiltInGraphViewPluginRoots: registerBuiltInPluginRoots,
}));

vi.mock('../../../../src/extension/graphView/groups/merged', () => ({
  buildGraphViewMergedGroups: buildMergedGroups,
}));

vi.mock('../../../../src/extension/graphView/webview/plugins/resources', () => ({
  getGraphViewWebviewResourceRoots: getWebviewResourceRoots,
  refreshGraphViewResourceRoots: refreshWebviewResourceRoots,
  resolveGraphViewPluginAssetPath: resolvePluginAssetPath,
}));

vi.mock('../../../../src/extension/graphView/resources', () => ({
  normalizeGraphViewExtensionUri: normalizeExtensionUri,
}));

import { createGraphViewProviderPluginResourceMethods } from '../../../../src/extension/graphView/provider/plugin/resources';

describe('graphView/provider/plugin/resources default dependencies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPluginDefaultGroups.mockReturnValue([]);
    getBuiltInDefaultGroups.mockReturnValue([]);
    buildMergedGroups.mockReturnValue([]);
  });

  it('reads legend visibility and legend order defaults from the CodeGraphy configuration', () => {
    getConfigValue
      .mockImplementationOnce((key: string, fallback: Record<string, boolean>) => {
        expect(key).toBe('legendVisibility');
        expect(fallback).toEqual({});
        return { plugin: false };
      })
      .mockImplementationOnce((key: string, fallback: string[]) => {
        expect(key).toBe('legendOrder');
        expect(fallback).toEqual([]);
        return ['plugin', 'user'];
      });

    const source = {
      _extensionUri: vscode.Uri.file('/extension'),
      _pluginExtensionUris: new Map<string, vscode.Uri>(),
      _analyzer: undefined,
      _disabledPlugins: new Set<string>(),
      _userGroups: [{ id: 'user', pattern: '*.ts', color: '#fff' }] as IGroup[],
      _groups: [],
      _panels: [],
    };
    const methods = createGraphViewProviderPluginResourceMethods(source as never);

    methods._computeMergedGroups();

    expect(buildMergedGroups).toHaveBeenCalledWith(
      source._userGroups,
      [],
      [],
      { plugin: false },
      ['plugin', 'user'],
    );
    expect(source._groups).toEqual([]);
  });

  it('falls back to empty legend settings when the configuration returns undefined', () => {
    getConfigValue.mockReturnValue(undefined);

    const source = {
      _extensionUri: vscode.Uri.file('/extension'),
      _pluginExtensionUris: new Map<string, vscode.Uri>(),
      _analyzer: undefined,
      _disabledPlugins: new Set<string>(),
      _userGroups: [],
      _groups: [],
      _panels: [],
    };
    const methods = createGraphViewProviderPluginResourceMethods(source as never);

    methods._computeMergedGroups();

    expect(getConfigValue).toHaveBeenNthCalledWith(1, 'legendVisibility', {});
    expect(getConfigValue).toHaveBeenNthCalledWith(2, 'legendOrder', []);
    expect(buildMergedGroups).toHaveBeenCalledWith([], [], [], {}, []);
  });
});
