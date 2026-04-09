import { describe, expect, it } from 'vitest';
import * as vscode from 'vscode';
import {
  buildGraphViewContext,
  getGraphViewActivePluginIds,
  getGraphViewRelativePath,
} from '../../../../src/extension/graphView/view/context';

describe('graphView/view/context', () => {
  it('returns an empty plugin id set when there is no analyzer', () => {
    expect([...getGraphViewActivePluginIds(undefined)]).toEqual([]);
  });

  it('collects active plugin ids from the analyzer registry', () => {
    const pluginIds = getGraphViewActivePluginIds({
      registry: {
        list: () => [
          { plugin: { id: 'plugin.alpha' } },
          { plugin: { id: 'plugin.beta' } },
          { plugin: { id: 'plugin.alpha' } },
          { plugin: {} },
        ],
      },
    });

    expect([...pluginIds]).toEqual(['plugin.alpha', 'plugin.beta']);
  });

  it('ignores plugin entries without an id', () => {
    const pluginIds = getGraphViewActivePluginIds({
      registry: {
        list: () => [{ plugin: {} }, {}],
      },
    });

    expect([...pluginIds]).toEqual([]);
  });

  it('returns workspace-relative paths through the shared path helper', () => {
    const relativePath = getGraphViewRelativePath(
      vscode.Uri.file('/workspace/src/app.ts'),
      [{ uri: vscode.Uri.file('/workspace') } as vscode.WorkspaceFolder],
      (uri: vscode.Uri) => uri.fsPath.replace('/workspace/', ''),
    );

    expect(relativePath).toBe('src/app.ts');
  });

  it('builds the current view context from workspace state and editor state', () => {
    const context = buildGraphViewContext({
      analyzer: {
        registry: {
          list: () => [{ plugin: { id: 'plugin.alpha' } }],
        },
      },
      workspaceFolders: [{ uri: vscode.Uri.file('/workspace') } as vscode.WorkspaceFolder],
      activeEditor: {
        document: { uri: vscode.Uri.file('/workspace/src/app.ts') },
      } as vscode.TextEditor,
      readSavedDepthLimit: () => 4,
      asRelativePath: (uri: vscode.Uri) => uri.fsPath.replace('/workspace/', ''),
      defaultDepthLimit: 1,
    });

    expect(context).toEqual({
      activePlugins: new Set(['plugin.alpha']),
      workspaceRoot: '/workspace',
      focusedFile: 'src/app.ts',
      depthLimit: 4,
    });
  });

  it('falls back to default context values without workspace or editor state', () => {
    const context = buildGraphViewContext({
      analyzer: undefined,
      workspaceFolders: undefined,
      activeEditor: undefined,
      readSavedDepthLimit: () => undefined,
      asRelativePath: () => 'ignored.ts',
      defaultDepthLimit: 3,
    });

    expect(context).toEqual({
      activePlugins: new Set(),
      workspaceRoot: undefined,
      focusedFile: undefined,
      depthLimit: 3,
    });
  });
});
