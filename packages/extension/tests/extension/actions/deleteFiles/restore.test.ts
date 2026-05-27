import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  restoreDirectories,
  restoreFiles,
} from '../../../../src/extension/actions/deleteFiles/restore';

vi.mock('vscode', () => ({
  workspace: {
    fs: {
      createDirectory: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined),
    },
  },
  window: {
    showErrorMessage: vi.fn(),
  },
  Uri: {
    joinPath: vi.fn((base: { fsPath: string }, ...pathSegments: string[]) => ({
      fsPath: `${base.fsPath}/${pathSegments.join('/')}`,
      toString: () => `file://${base.fsPath}/${pathSegments.join('/')}`,
    })),
  },
}));

describe('extension/actions/deleteFiles/restore', () => {
  const workspaceFolder = { fsPath: '/workspace' } as vscode.Uri;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(vscode.workspace.fs.createDirectory).mockResolvedValue(undefined);
    vi.mocked(vscode.workspace.fs.writeFile).mockResolvedValue(undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('restores directories from parent to child', async () => {
    await restoreDirectories(workspaceFolder, ['src/nested', 'src']);

    expect(vscode.workspace.fs.createDirectory).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ fsPath: '/workspace/src' }),
    );
    expect(vscode.workspace.fs.createDirectory).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ fsPath: '/workspace/src/nested' }),
    );
  });

  it('reports directory restore failures with the directory path', async () => {
    const error = new Error('mkdir failed');
    vi.mocked(vscode.workspace.fs.createDirectory).mockRejectedValueOnce(error);

    await restoreDirectories(workspaceFolder, ['src']);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[CodeGraphy] Failed to restore src:',
      error,
    );
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Failed to restore src');
  });

  it('writes each stored file back to the workspace', async () => {
    const content = new Uint8Array([1, 2, 3]);

    await restoreFiles(workspaceFolder, [{ path: 'src/app.ts', content }]);

    expect(vscode.workspace.fs.writeFile).toHaveBeenCalledWith(
      expect.objectContaining({ fsPath: '/workspace/src/app.ts' }),
      content,
    );
  });
});
