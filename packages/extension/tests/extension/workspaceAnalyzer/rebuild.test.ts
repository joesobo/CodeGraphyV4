import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { WorkspaceAnalyzer } from '../../../src/extension/workspaceAnalyzer/service';

Object.defineProperty(vscode.workspace, 'workspaceFolders', {
  get: () => [{ uri: vscode.Uri.file('/test/workspace'), name: 'workspace', index: 0 }],
  configurable: true,
});

describe('WorkspaceAnalyzer rebuild', () => {
  it('skips graph rebuilding when there are no cached file connections', () => {
    const analyzer = new WorkspaceAnalyzer({
      subscriptions: [],
      extensionUri: vscode.Uri.file('/test/extension'),
      workspaceState: {
        get: vi.fn(() => undefined),
        update: vi.fn(() => Promise.resolve()),
      },
    } as unknown as vscode.ExtensionContext);
    const buildGraphSpy = vi.spyOn((analyzer as unknown as {
      _buildGraphData: () => unknown;
    }), '_buildGraphData');

    expect(analyzer.rebuildGraph(new Set(), new Set(), true)).toEqual({
      nodes: [],
      edges: [],
    });
    expect(buildGraphSpy).not.toHaveBeenCalled();
  });
});
