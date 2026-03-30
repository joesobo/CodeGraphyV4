import { describe, expect, it } from 'vitest';
import * as vscode from 'vscode';
import {
  getBuiltInGraphViewPluginDir,
  registerBuiltInGraphViewPluginRoots,
} from '../../../../../src/extension/graphView/groups/defaults/pluginRoots';

describe('graphView/builtInPluginRoots', () => {
  it('resolves built-in plugin directories by plugin id', () => {
    expect(getBuiltInGraphViewPluginDir('codegraphy.markdown')).toBe('plugin-markdown');
    expect(getBuiltInGraphViewPluginDir('codegraphy.unknown')).toBeUndefined();
  });

  it('registers built-in plugin package roots exactly once', () => {
    const pluginExtensionUris = new Map<string, vscode.Uri>();

    registerBuiltInGraphViewPluginRoots(vscode.Uri.file('/test/extension'), pluginExtensionUris);
    registerBuiltInGraphViewPluginRoots(vscode.Uri.file('/test/extension'), pluginExtensionUris);

    expect([...pluginExtensionUris.entries()]).toEqual([
      ['codegraphy.markdown', vscode.Uri.file('/test/extension/packages/plugin-markdown')],
    ]);
  });

  it('preserves an existing built-in plugin root while adding the missing ones', () => {
    const pluginExtensionUris = new Map<string, vscode.Uri>([
      ['codegraphy.markdown', vscode.Uri.file('/custom/plugin-markdown')],
    ]);

    registerBuiltInGraphViewPluginRoots(vscode.Uri.file('/test/extension'), pluginExtensionUris);

    expect([...pluginExtensionUris.entries()]).toEqual([
      ['codegraphy.markdown', vscode.Uri.file('/custom/plugin-markdown')],
    ]);
  });
});
