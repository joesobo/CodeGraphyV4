import * as vscode from 'vscode';
import { describe, expect, it, vi } from 'vitest';
import type { IGroup } from '../../../../../src/shared/settings/groups';
import { createGraphViewProviderPluginResourceMethods } from '../../../../../src/extension/graphView/provider/plugin/resources';

describe('graphView/provider/plugin/resources', () => {
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
    const defaultLegendVisibility = { plugin: false };
    const legendOrder = ['plugin', 'user'];
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
      getDefaultLegendVisibility: vi.fn(() => defaultLegendVisibility),
      getLegendOrder: vi.fn(() => legendOrder),
      getWorkspaceFolders: vi.fn(() => []),
    });

    methods._registerBuiltInPluginRoots();
    methods._computeMergedGroups();

    expect(source._pluginExtensionUris.get('plugin.test')?.fsPath).toBe('/extension');
    expect(buildMergedGroups).toHaveBeenCalledWith(
      source._userGroups,
      builtInGroups,
      pluginGroups,
      defaultLegendVisibility,
      legendOrder,
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
      _view: undefined,
      _timelineView: { webview: { options: {} } } as never,
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
      getDefaultLegendVisibility: vi.fn(() => ({})),
      getLegendOrder: vi.fn(() => []),
      getWorkspaceFolders: vi.fn(() => [{ uri: vscode.Uri.file('/workspace') }] as never),
    });

    expect(methods._resolveWebviewAssetPath('icon.svg', 'plugin.test')).toBe('asset://icon.svg');
    expect(methods._getLocalResourceRoots()).toEqual([vscode.Uri.file('/workspace')]);
    methods._refreshWebviewResourceRoots();

    expect(resolvePluginAssetPath).toHaveBeenCalledWith(
      'icon.svg',
      source._extensionUri,
      source._pluginExtensionUris,
      source._timelineView,
      source._panels,
      'plugin.test',
    );
    expect(getWebviewResourceRoots).toHaveBeenCalledTimes(3);
    expect(refreshWebviewResourceRoots).toHaveBeenCalledWith(
      source._view,
      source._panels,
      [vscode.Uri.file('/workspace')],
    );
    expect(refreshWebviewResourceRoots).toHaveBeenCalledWith(
      source._timelineView,
      [],
      [vscode.Uri.file('/workspace')],
    );
  });

  it('returns built-in and plugin default groups through the dependency helpers', () => {
    const builtInGroups = [{ id: 'built-in', pattern: '*.md', color: '#000' }] satisfies IGroup[];
    const pluginGroups = [{ id: 'plugin', pattern: '*.gd', color: '#090' }] satisfies IGroup[];
    const methods = createGraphViewProviderPluginResourceMethods({
      _extensionUri: vscode.Uri.file('/extension'),
      _pluginExtensionUris: new Map<string, vscode.Uri>(),
      _analyzer: { registry: { list: vi.fn(() => []) } } as never,
      _disabledPlugins: new Set(['plugin.disabled']),
      _userGroups: [],
      _groups: [],
      _panels: [],
    } as never, {
      registerBuiltInPluginRoots: vi.fn(),
      getPluginDefaultGroups: vi.fn(() => pluginGroups),
      getBuiltInDefaultGroups: vi.fn(() => builtInGroups),
      buildMergedGroups: vi.fn(() => []),
      resolvePluginAssetPath: vi.fn(() => ''),
      getWebviewResourceRoots: vi.fn(() => []),
      refreshWebviewResourceRoots: vi.fn(),
      normalizeExtensionUri: vi.fn(),
      getDefaultLegendVisibility: vi.fn(() => ({})),
      getLegendOrder: vi.fn(() => []),
      getWorkspaceFolders: vi.fn(() => []),
    });

    expect(methods._getBuiltInDefaultGroups()).toEqual(builtInGroups);
    expect(methods._getPluginDefaultGroups()).toEqual(pluginGroups);
  });

  it('passes undefined external uris through normalization unchanged', () => {
    const normalizeExtensionUri = vi.fn(uri => uri);
    const methods = createGraphViewProviderPluginResourceMethods({
      _extensionUri: vscode.Uri.file('/extension'),
      _pluginExtensionUris: new Map<string, vscode.Uri>(),
      _analyzer: undefined,
      _disabledPlugins: new Set<string>(),
      _userGroups: [],
      _groups: [],
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
      getDefaultLegendVisibility: vi.fn(() => ({})),
      getLegendOrder: vi.fn(() => []),
      getWorkspaceFolders: vi.fn(() => []),
    });

    expect(methods._normalizeExternalExtensionUri(undefined)).toBeUndefined();
    expect(normalizeExtensionUri).toHaveBeenCalledWith(undefined);
  });

  it('keeps the primary webview refresh when there is no timeline view', () => {
    const refreshWebviewResourceRoots = vi.fn();
    const source = {
      _extensionUri: vscode.Uri.file('/extension'),
      _pluginExtensionUris: new Map<string, vscode.Uri>(),
      _analyzer: undefined,
      _disabledPlugins: new Set<string>(),
      _userGroups: [],
      _groups: [],
      _view: { webview: { options: {} } } as never,
      _panels: [{ webview: { options: {} } }] as never,
    };
    const methods = createGraphViewProviderPluginResourceMethods(source as never, {
      registerBuiltInPluginRoots: vi.fn(),
      getPluginDefaultGroups: vi.fn(() => []),
      getBuiltInDefaultGroups: vi.fn(() => []),
      buildMergedGroups: vi.fn(() => []),
      resolvePluginAssetPath: vi.fn(() => ''),
      getWebviewResourceRoots: vi.fn(() => [vscode.Uri.file('/workspace')]),
      refreshWebviewResourceRoots,
      normalizeExtensionUri: vi.fn(),
      getDefaultLegendVisibility: vi.fn(() => ({})),
      getLegendOrder: vi.fn(() => []),
      getWorkspaceFolders: vi.fn(() => []),
    });

    methods._refreshWebviewResourceRoots();

    expect(refreshWebviewResourceRoots).toHaveBeenCalledTimes(1);
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
      getDefaultLegendVisibility: vi.fn(() => ({})),
      getLegendOrder: vi.fn(() => []),
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
