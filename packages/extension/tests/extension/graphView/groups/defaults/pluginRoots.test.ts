import { describe, expect, it } from 'vitest';
import * as vscode from 'vscode';
import {
  getBuiltInGraphViewPluginDir,
  registerBuiltInGraphViewPluginRoots,
} from '../../../../../src/extension/graphView/groups/defaults/pluginRoots';

describe('graphView/builtInPluginRoots', () => {
  it('resolves built-in plugin directories by plugin id', () => {
    expect(getBuiltInGraphViewPluginDir('codegraphy.godot')).toBe('plugin-godot');
    expect(getBuiltInGraphViewPluginDir('codegraphy.markdown')).toBeUndefined();
    expect(getBuiltInGraphViewPluginDir('codegraphy.unknown')).toBeUndefined();
  });

  it('registers built-in plugin package roots exactly once', () => {
    const pluginExtensionUris = new Map<string, vscode.Uri>();

    registerBuiltInGraphViewPluginRoots(vscode.Uri.file('/test/extension'), pluginExtensionUris);
    registerBuiltInGraphViewPluginRoots(vscode.Uri.file('/test/extension'), pluginExtensionUris);

    expect([...pluginExtensionUris.entries()]).toEqual([
      ['codegraphy.godot', vscode.Uri.file('/test/extension/packages/plugin-godot')],
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
    expect(pluginExtensionUris.has('codegraphy.markdown')).toBe(false);
  });
});
