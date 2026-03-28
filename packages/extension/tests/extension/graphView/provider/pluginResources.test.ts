import * as vscode from 'vscode';
import { describe, expect, it, vi } from 'vitest';
import type { IGroup } from '../../../../src/shared/contracts';
import { createGraphViewProviderPluginResourceMethods } from '../../../../src/extension/graphView/provider/pluginResources';

describe('graphView/provider/pluginResources', () => {
  it('registers built-in plugin roots and computes merged groups', () => {
    const source = {
      _extensionUri: vscode.Uri.file('/extension'),
      _pluginExtensionUris: new Map<string, vscode.Uri>(),
      _analyzer: { registry: { list: vi.fn(() => []) } },
      _disabledPlugins: new Set<string>(),
      _userGroups: [{ id: 'user', pattern: '*.ts', color: '#fff' } satisfies IGroup],
      _hiddenPluginGroupIds: new Set<string>(),
      _groups: [],
      _view: undefined,
      _panels: [],
    };
    const builtInGroups = [{ id: 'built-in', pattern: '*.md', color: '#000' }] satisfies IGroup[];
    const pluginGroups = [{ id: 'plugin', pattern: '*.gd', color: '#090' }] satisfies IGroup[];
    const buildMergedGroups = vi.fn(() => [...builtInGroups, ...pluginGroups]);
    const methods = createGraphViewProviderPluginResourceMethods(source as never, {
      registerBuiltInPluginRoots: vi.fn((extensionUri, roots) => {
        roots.set('plugin.test', extensionUri);
      }),
      getPluginDefaultGroups: vi.fn(() => pluginGroups),
      getBuiltInDefaultGroups: vi.fn(() => builtInGroups),
      buildMergedGroups,
      resolvePluginAssetPath: vi.fn(() => 'asset://icon.svg'),
      getWebviewResourceRoots: vi.fn(() => []),
      refreshWebviewResourceRoots: vi.fn(),
      normalizeExtensionUri: vi.fn(),
      getWorkspaceFolders: vi.fn(() => []),
    });

    methods._registerBuiltInPluginRoots();
    methods._computeMergedGroups();

    expect(source._pluginExtensionUris.get('plugin.test')?.fsPath).toBe('/extension');
    expect(buildMergedGroups).toHaveBeenCalledWith(
      source._userGroups,
      source._hiddenPluginGroupIds,
      builtInGroups,
      pluginGroups,
    );
    expect(source._groups).toEqual([...builtInGroups, ...pluginGroups]);
  });

  it('resolves plugin asset paths and local resource roots through the shared helpers', () => {
    const resolvePluginAssetPath = vi.fn(() => 'asset://icon.svg');
    const getWebviewResourceRoots = vi.fn(() => [vscode.Uri.file('/workspace')]);
    const refreshWebviewResourceRoots = vi.fn();
    const source = {
      _extensionUri: vscode.Uri.file('/extension'),
      _pluginExtensionUris: new Map<string, vscode.Uri>(),
      _analyzer: undefined,
      _disabledPlugins: new Set<string>(),
      _userGroups: [],
      _hiddenPluginGroupIds: new Set<string>(),
      _groups: [],
      _view: { webview: { options: {} } } as never,
      _panels: [{ webview: { options: {} } }] as never,
    };
    const methods = createGraphViewProviderPluginResourceMethods(source as never, {
      registerBuiltInPluginRoots: vi.fn(),
      getPluginDefaultGroups: vi.fn(() => []),
      getBuiltInDefaultGroups: vi.fn(() => []),
      buildMergedGroups: vi.fn(() => []),
      resolvePluginAssetPath,
      getWebviewResourceRoots,
      refreshWebviewResourceRoots,
      normalizeExtensionUri: vi.fn(uri => (typeof uri === 'string' ? vscode.Uri.file(uri) : uri)),
      getWorkspaceFolders: vi.fn(() => [{ uri: vscode.Uri.file('/workspace') }] as never),
    });

    expect(methods._resolveWebviewAssetPath('icon.svg', 'plugin.test')).toBe('asset://icon.svg');
    expect(methods._getLocalResourceRoots()).toEqual([vscode.Uri.file('/workspace')]);
    methods._refreshWebviewResourceRoots();

    expect(resolvePluginAssetPath).toHaveBeenCalledWith(
      'icon.svg',
      source._extensionUri,
      source._pluginExtensionUris,
      source._view,
      source._panels,
      'plugin.test',
    );
    expect(getWebviewResourceRoots).toHaveBeenCalledTimes(2);
    expect(refreshWebviewResourceRoots).toHaveBeenCalledWith(
      source._view,
      source._panels,
      [vscode.Uri.file('/workspace')],
    );
  });

  it('normalizes external extension uris with the shared graph-view helper', () => {
    const normalizeExtensionUri = vi.fn(uri =>
      typeof uri === 'string' ? vscode.Uri.file(uri) : uri,
    );
    const methods = createGraphViewProviderPluginResourceMethods({
      _extensionUri: vscode.Uri.file('/extension'),
      _pluginExtensionUris: new Map<string, vscode.Uri>(),
      _analyzer: undefined,
      _disabledPlugins: new Set<string>(),
      _userGroups: [],
      _hiddenPluginGroupIds: new Set<string>(),
      _groups: [],
      _view: undefined,
      _panels: [],
    } as never, {
      registerBuiltInPluginRoots: vi.fn(),
      getPluginDefaultGroups: vi.fn(() => []),
      getBuiltInDefaultGroups: vi.fn(() => []),
      buildMergedGroups: vi.fn(() => []),
      resolvePluginAssetPath: vi.fn(() => ''),
      getWebviewResourceRoots: vi.fn(() => []),
      refreshWebviewResourceRoots: vi.fn(),
      normalizeExtensionUri,
      getWorkspaceFolders: vi.fn(() => []),
    });

    expect(methods._normalizeExternalExtensionUri('/plugin')).toEqual(vscode.Uri.file('/plugin'));
    expect(normalizeExtensionUri).toHaveBeenCalledWith('/plugin');
  });

  it('uses the default dependency set for workspace resource roots and uri normalization', () => {
    const workspace = vscode.workspace as { workspaceFolders?: readonly vscode.WorkspaceFolder[] };
    const originalWorkspaceFolders = workspace.workspaceFolders;
    workspace.workspaceFolders = [{ uri: vscode.Uri.file('/workspace') }] as vscode.WorkspaceFolder[];

    try {
      const source = {
        _extensionUri: vscode.Uri.file('/extension'),
        _pluginExtensionUris: new Map<string, vscode.Uri>([
          ['plugin.test', vscode.Uri.file('/plugin-root')],
        ]),
        _analyzer: undefined,
        _disabledPlugins: new Set<string>(),
        _userGroups: [],
        _hiddenPluginGroupIds: new Set<string>(),
        _groups: [],
        _view: undefined,
        _panels: [],
      };
      const methods = createGraphViewProviderPluginResourceMethods(source as never);

      expect(methods._normalizeExternalExtensionUri('/plugin')).toEqual(vscode.Uri.file('/plugin'));
      expect(methods._getLocalResourceRoots()).toEqual([
        vscode.Uri.file('/extension'),
        vscode.Uri.file('/plugin-root'),
        vscode.Uri.file('/workspace'),
      ]);
    } finally {
      workspace.workspaceFolders = originalWorkspaceFolders;
    }
  });
});
