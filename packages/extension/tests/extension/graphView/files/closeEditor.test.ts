import { describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';
import { closeGraphViewFileEditor } from '../../../../src/extension/graphView/files/closeEditor';

function uri(value: string): vscode.Uri {
  return { toString: () => `file://${value}` } as vscode.Uri;
}

describe('graphView/files/closeEditor', () => {
  it('closes every text tab for the requested workspace file while preserving focus', async () => {
    const matchingTab = { input: { uri: uri('/workspace/src/app.ts') } } as vscode.Tab;
    const otherTab = { input: { uri: uri('/workspace/src/other.ts') } } as vscode.Tab;
    const closeTabs = vi.fn(async () => true);

    await closeGraphViewFileEditor('src/app.ts', {
      closeTabs,
      getTabUri: tab => (tab.input as { uri?: vscode.Uri }).uri,
      joinPath: (_base, path) => uri(`/workspace/${path}`),
      tabs: [matchingTab, otherTab],
      workspaceFolder: uri('/workspace'),
    });

    expect(closeTabs).toHaveBeenCalledWith([matchingTab], true);
  });

  it('does not call the tab API when the file has no open editor', async () => {
    const closeTabs = vi.fn(async () => true);

    await closeGraphViewFileEditor('src/app.ts', {
      closeTabs,
      getTabUri: () => undefined,
      joinPath: (_base, path) => uri(`/workspace/${path}`),
      tabs: [],
      workspaceFolder: uri('/workspace'),
    });

    expect(closeTabs).not.toHaveBeenCalled();
  });
});
