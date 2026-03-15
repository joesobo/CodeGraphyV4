import { describe, expect, it } from 'vitest';
import * as vscode from 'vscode';
import {
  buildGraphViewContext,
  getGraphViewActivePluginIds,
  getGraphViewRelativePath,
} from '../../../src/extension/graphView/viewContext';

describe('graph view context helpers', () => {
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
      readFolderNodeColor: () => '#112233',
      asRelativePath: (uri: vscode.Uri) => uri.fsPath.replace('/workspace/', ''),
      defaultDepthLimit: 1,
    });

    expect(context).toEqual({
      activePlugins: new Set(['plugin.alpha']),
      workspaceRoot: '/workspace',
      focusedFile: 'src/app.ts',
      depthLimit: 4,
      folderNodeColor: '#112233',
    });
  });
});
