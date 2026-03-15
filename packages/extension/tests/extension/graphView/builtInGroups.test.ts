import { describe, expect, it } from 'vitest';
import * as vscode from 'vscode';
import {
  getBuiltInGraphViewDefaultGroups,
  registerBuiltInGraphViewPluginRoots,
} from '../../../src/extension/graphView/builtInGroups';

describe('graphView/builtInGroups', () => {
  it('registers built-in plugin package roots exactly once', () => {
    const pluginExtensionUris = new Map<string, vscode.Uri>();

    registerBuiltInGraphViewPluginRoots(vscode.Uri.file('/test/extension'), pluginExtensionUris);
    registerBuiltInGraphViewPluginRoots(vscode.Uri.file('/test/extension'), pluginExtensionUris);

    expect([...pluginExtensionUris.entries()]).toEqual([
      ['codegraphy.typescript', vscode.Uri.file('/test/extension/packages/plugin-typescript')],
      ['codegraphy.gdscript', vscode.Uri.file('/test/extension/packages/plugin-godot')],
      ['codegraphy.python', vscode.Uri.file('/test/extension/packages/plugin-python')],
      ['codegraphy.csharp', vscode.Uri.file('/test/extension/packages/plugin-csharp')],
      ['codegraphy.markdown', vscode.Uri.file('/test/extension/packages/plugin-markdown')],
    ]);
  });

  it('builds the built-in default groups with CodeGraphy metadata', () => {
    expect(getBuiltInGraphViewDefaultGroups()).toContainEqual({
      id: 'default:*.json',
      pattern: '*.json',
      color: '#F9C74F',
      isPluginDefault: true,
      pluginName: 'CodeGraphy',
    });
  });
});
