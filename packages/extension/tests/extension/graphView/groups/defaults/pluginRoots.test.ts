import { describe, expect, it } from 'vitest';
import * as vscode from 'vscode';
import {
  getBuiltInGraphViewPluginDir,
  registerBuiltInGraphViewPluginRoots,
  registerPackageGraphViewPluginRoots,
} from '../../../../../src/extension/graphView/groups/defaults/pluginRoots';

describe('graphView/builtInPluginRoots', () => {
  it('resolves built-in plugin directories by plugin id', () => {
    expect(getBuiltInGraphViewPluginDir('codegraphy.godot')).toBe('plugin-godot');
    expect(getBuiltInGraphViewPluginDir('codegraphy.unity')).toBe('plugin-unity');
    expect(getBuiltInGraphViewPluginDir('codegraphy.unity.extension')).toBe('plugin-unity');
    expect(getBuiltInGraphViewPluginDir('codegraphy.markdown')).toBeUndefined();
    expect(getBuiltInGraphViewPluginDir('codegraphy.unknown')).toBeUndefined();
  });

  it('registers built-in plugin package roots exactly once', () => {
    const pluginExtensionUris = new Map<string, vscode.Uri>();

    registerBuiltInGraphViewPluginRoots(vscode.Uri.file('/test/extension'), pluginExtensionUris);
    registerBuiltInGraphViewPluginRoots(vscode.Uri.file('/test/extension'), pluginExtensionUris);

    expect([...pluginExtensionUris.entries()]).toEqual([
      ['codegraphy.godot', vscode.Uri.file('/test/extension/packages/plugin-godot')],
      ['codegraphy.unity', vscode.Uri.file('/test/extension/packages/plugin-unity')],
      ['codegraphy.unity.extension', vscode.Uri.file('/test/extension/packages/plugin-unity')],
    ]);
  });

  it('preserves an existing built-in plugin root while adding the missing ones', () => {
    const pluginExtensionUris = new Map<string, vscode.Uri>([
      ['codegraphy.godot', vscode.Uri.file('/custom/plugin-godot')],
    ]);

    registerBuiltInGraphViewPluginRoots(vscode.Uri.file('/test/extension'), pluginExtensionUris);

    expect(pluginExtensionUris.get('codegraphy.godot')).toEqual(
      vscode.Uri.file('/custom/plugin-godot'),
    );
    expect(pluginExtensionUris.get('codegraphy.unity')).toEqual(
      vscode.Uri.file('/test/extension/packages/plugin-unity'),
    );
    expect(pluginExtensionUris.has('codegraphy.markdown')).toBe(false);
  });

  it('replaces a linked package root when the same plugin id moves', () => {
    const pluginExtensionUris = new Map<string, vscode.Uri>([
      ['acme.view', vscode.Uri.file('/plugins/old')],
    ]);

    registerPackageGraphViewPluginRoots({
      registry: {
        list: () => [],
        extensionPlugins: {
          list: () => [{
            plugin: { id: 'acme.view' },
            sourcePackageRoot: '/plugins/new',
          }],
        },
      },
    }, pluginExtensionUris);

    expect(pluginExtensionUris.get('acme.view')).toEqual(vscode.Uri.file('/plugins/new'));
  });

  it('removes package roots for plugins that are no longer registered', () => {
    const pluginExtensionUris = new Map<string, vscode.Uri>([
      ['codegraphy.godot', vscode.Uri.file('/extension/packages/plugin-godot')],
      ['acme.disabled', vscode.Uri.file('/plugins/disabled')],
      ['acme.active', vscode.Uri.file('/plugins/active')],
    ]);

    registerPackageGraphViewPluginRoots({
      registry: {
        list: () => [],
        extensionPlugins: {
          list: () => [{
            plugin: { id: 'acme.active' },
            sourcePackageRoot: '/plugins/active',
          }],
        },
      },
    }, pluginExtensionUris);

    expect(pluginExtensionUris.has('acme.disabled')).toBe(false);
    expect(pluginExtensionUris.get('acme.active')).toEqual(vscode.Uri.file('/plugins/active'));
    expect(pluginExtensionUris.get('codegraphy.godot')).toEqual(
      vscode.Uri.file('/extension/packages/plugin-godot'),
    );
  });
});
