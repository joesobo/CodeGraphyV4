import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readWorkspaceAnalysisDatabaseSnapshot } from '@codegraphy-dev/core';
import * as vscode from 'vscode';
import { describe, expect, it } from 'vitest';
import { GraphViewProvider } from '../../src/extension/graphViewProvider';

describe('GraphViewProvider closed cache updates', () => {
  it('persists changed files before the Graph View has opened', async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), 'codegraphy-extension-closed-'));
    const sourcePath = join(workspaceRoot, 'source.md');
    await writeFile(sourcePath, 'See [[target.md]].\n', 'utf-8');
    await writeFile(join(workspaceRoot, 'target.md'), 'Target\n', 'utf-8');
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      configurable: true,
      value: [{ uri: vscode.Uri.file(workspaceRoot), name: 'workspace', index: 0 }],
    });
    const context = {
      subscriptions: [] as { dispose(): void }[],
      extensionUri: vscode.Uri.file('/test/extension'),
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    };
    const provider = new GraphViewProvider(
      context.extensionUri,
      context as unknown as vscode.ExtensionContext,
    );

    expect(provider.isGraphOpen()).toBe(false);
    await provider.refreshPersistedWorkspaceCache([sourcePath]);

    const snapshot = readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot);
    expect(snapshot.graph.nodes.map(node => node.id)).toEqual(
      expect.arrayContaining(['source.md', 'target.md']),
    );
  });
});
