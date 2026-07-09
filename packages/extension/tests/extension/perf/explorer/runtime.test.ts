import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { explorerComparisonRuntime } from '../../../../src/extension/perf/explorer/runtime';

const mocks = vi.hoisted(() => ({
  applyEdit: vi.fn(),
  createFile: vi.fn(),
  deleteFile: vi.fn(),
  executeCommand: vi.fn(),
  onDidCreateFiles: vi.fn(),
  onDidDeleteFiles: vi.fn(),
  onDidRenameFiles: vi.fn(),
  readFile: vi.fn(),
  renameFile: vi.fn(),
  stat: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock('vscode', () => ({
  Uri: {
    joinPath: vi.fn((base: { fsPath: string }, ...segments: string[]) => ({
      fsPath: [base.fsPath, ...segments].join('/'),
    })),
  },
  WorkspaceEdit: class WorkspaceEdit {
    createFile = mocks.createFile;
    deleteFile = mocks.deleteFile;
    renameFile = mocks.renameFile;
  },
  commands: { executeCommand: mocks.executeCommand },
  workspace: {
    applyEdit: mocks.applyEdit,
    fs: {
      readFile: mocks.readFile,
      stat: mocks.stat,
      writeFile: mocks.writeFile,
    },
    onDidCreateFiles: mocks.onDidCreateFiles,
    onDidDeleteFiles: mocks.onDidDeleteFiles,
    onDidRenameFiles: mocks.onDidRenameFiles,
  },
}));

const oldUri = { fsPath: '/fixture/src/old.ts' } as vscode.Uri;
const newUri = { fsPath: '/fixture/src/new.ts' } as vscode.Uri;

describe('extension/perf/explorer/runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.applyEdit.mockResolvedValue(true);
  });

  it('applies a prompt-free rename through WorkspaceEdit', async () => {
    await expect(explorerComparisonRuntime.applyRenameFile(oldUri, newUri))
      .resolves.toBe(true);

    expect(mocks.renameFile).toHaveBeenCalledWith(oldUri, newUri, {
      ignoreIfExists: false,
      overwrite: false,
    });
    expect(mocks.applyEdit).toHaveBeenCalledWith(expect.anything());
  });

  it('applies a prompt-free create through WorkspaceEdit', async () => {
    await expect(explorerComparisonRuntime.applyCreateFile(newUri)).resolves.toBe(true);

    expect(mocks.createFile).toHaveBeenCalledWith(newUri, {
      ignoreIfExists: false,
      overwrite: false,
    });
  });

  it('applies a prompt-free delete through WorkspaceEdit', async () => {
    await expect(explorerComparisonRuntime.applyDeleteFile(oldUri)).resolves.toBe(true);

    expect(mocks.deleteFile).toHaveBeenCalledWith(oldUri, {
      ignoreIfNotExists: false,
      recursive: false,
    });
  });

  it('subscribes to VS Code workspace file-operation events', () => {
    const listener = vi.fn();
    const disposable = { dispose: vi.fn() };
    mocks.onDidRenameFiles.mockReturnValue(disposable);
    mocks.onDidCreateFiles.mockReturnValue(disposable);
    mocks.onDidDeleteFiles.mockReturnValue(disposable);

    expect(explorerComparisonRuntime.onDidRenameFiles(listener)).toBe(disposable);
    expect(explorerComparisonRuntime.onDidCreateFiles(listener)).toBe(disposable);
    expect(explorerComparisonRuntime.onDidDeleteFiles(listener)).toBe(disposable);
  });

  it('opens and reveals through built-in Explorer commands', async () => {
    mocks.executeCommand.mockResolvedValue(undefined);

    await explorerComparisonRuntime.showExplorer();
    await explorerComparisonRuntime.revealInExplorer(oldUri);

    expect(mocks.executeCommand.mock.calls).toEqual([
      ['workbench.view.explorer'],
      ['revealInExplorer', oldUri],
    ]);
  });

  it('reads and writes deterministic fixture files', async () => {
    const contents = new Uint8Array([1, 2, 3]);
    mocks.stat.mockResolvedValue({});
    mocks.readFile.mockResolvedValue(contents);

    await expect(explorerComparisonRuntime.readFile(
      { fsPath: '/fixture' } as vscode.Uri,
      'src/file.ts',
    )).resolves.toBe(contents);
    await explorerComparisonRuntime.writeFile(oldUri, contents);

    expect(mocks.writeFile).toHaveBeenCalledWith(oldUri, contents);
    expect(vscode.Uri.joinPath).toHaveBeenCalledWith(
      { fsPath: '/fixture' },
      'src',
      'file.ts',
    );
  });

  it('reports an absent fixture file', async () => {
    mocks.stat.mockRejectedValue(new Error('missing'));

    await expect(explorerComparisonRuntime.readFile(
      { fsPath: '/fixture' } as vscode.Uri,
      'src/missing.ts',
    )).resolves.toBeUndefined();
    expect(mocks.readFile).not.toHaveBeenCalled();
  });

  it('joins a workspace-relative fixture path by segments', () => {
    expect(explorerComparisonRuntime.joinPath(
      { fsPath: '/fixture' } as vscode.Uri,
      'src/group/file.ts',
    )).toEqual({ fsPath: '/fixture/src/group/file.ts' });
  });

  it('waits for one workbench dispatch turn', async () => {
    await expect(explorerComparisonRuntime.waitForWorkbenchDispatchTurn())
      .resolves.toBeUndefined();
  });
});
