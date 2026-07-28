import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  indexCodeGraphyWorkspace,
  readWorkspaceAnalysisDatabaseSnapshot,
} from '@codegraphy-dev/core';
import * as vscode from 'vscode';
import { describe, expect, it, vi } from 'vitest';
import { GraphViewProvider } from '../../src/extension/graphViewProvider';

describe('GraphViewProvider closed cache updates', () => {
  it('persists changed files before the Graph View has opened', async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), 'codegraphy-extension-closed-'));
    const sourcePath = join(workspaceRoot, 'source.md');
    const targetPath = join(workspaceRoot, 'target.md');
    await writeFile(sourcePath, 'Source\n', 'utf-8');
    await writeFile(targetPath, 'Target\n', 'utf-8');
    await indexCodeGraphyWorkspace({ workspaceRoot });
    await rm(targetPath);
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
    await provider.refreshPersistedWorkspaceCache([targetPath]);

    const snapshot = readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot);
    expect(snapshot.graph.nodes.map(node => node.id)).toContain('source.md');
    expect(snapshot.graph.nodes.map(node => node.id)).not.toContain('target.md');
  });

  it('uses the resolved Graph View pipeline for closed-view lifecycle updates', async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), 'codegraphy-extension-hidden-'));
    const sourcePath = join(workspaceRoot, 'source.md');
    await writeFile(sourcePath, 'Source\n', 'utf-8');
    await indexCodeGraphyWorkspace({ workspaceRoot });
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
    const internals = provider as unknown as {
      _view: vscode.WebviewView;
      _methodContainers: {
        refresh: {
          refreshChangedFiles(filePaths: readonly string[]): Promise<void>;
          refreshGitignoreMetadata(): Promise<void>;
          refreshIndex(): Promise<void>;
        };
      };
    };
    internals._view = { visible: false } as vscode.WebviewView;
    const changed = vi.spyOn(internals._methodContainers.refresh, 'refreshChangedFiles')
      .mockResolvedValue(undefined);
    const gitignore = vi.spyOn(internals._methodContainers.refresh, 'refreshGitignoreMetadata')
      .mockResolvedValue(undefined);
    const settings = vi.spyOn(internals._methodContainers.refresh, 'refreshIndex')
      .mockResolvedValue(undefined);

    await provider.refreshPersistedWorkspaceCache([sourcePath]);
    await provider.refreshPersistedWorkspaceCache([join(workspaceRoot, '.gitignore')]);
    await provider.refreshPersistedWorkspaceCache([
      join(workspaceRoot, '.codegraphy', 'settings.json'),
    ]);

    expect(changed).toHaveBeenCalledWith([sourcePath]);
    expect(gitignore).toHaveBeenCalledOnce();
    expect(settings).toHaveBeenCalledOnce();
    await provider.dispose();
  });
});
