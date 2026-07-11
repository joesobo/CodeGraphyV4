import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';
import {
  PasteClipboardFilesAction,
  type ClipboardFileOperations,
  type ClipboardFilesSnapshot,
} from '../../../../src/extension/actions/clipboardFiles/action';

function uri(value: string): vscode.Uri {
  return {
    path: value,
    fsPath: value,
    scheme: 'file',
    toString: () => `file://${value}`,
  } as vscode.Uri;
}

function snapshot(mode: 'copy' | 'cut', paths = ['app.ts']): ClipboardFilesSnapshot {
  return { mode, paths, workspaceFolder: uri('/workspace') };
}

function createOperations(): ClipboardFileOperations {
  return {
    copy: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
    joinPath: (base, ...segments) => uri([base.path, ...segments].join('/').replace(/\/+/g, '/')),
    readDirectory: vi.fn(async () => []),
    rename: vi.fn(async () => undefined),
    stat: vi.fn(async () => {
      throw new Error('not found');
    }),
  };
}

describe('actions/clipboardFiles/action', () => {
  let operations: ClipboardFileOperations;
  let refreshGraph: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    operations = createOperations();
    refreshGraph = vi.fn(async () => undefined);
  });

  it('copies to an Explorer-style collision name and removes the copy on undo', async () => {
    vi.mocked(operations.readDirectory).mockResolvedValue([
      ['app.ts', 1 as vscode.FileType],
    ]);
    const action = new PasteClipboardFilesAction(
      snapshot('copy'),
      uri('/workspace'),
      'src',
      refreshGraph,
      operations,
    );

    await action.execute();

    expect(operations.copy).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/workspace/app.ts' }),
      expect.objectContaining({ path: '/workspace/src/app copy.ts' }),
      { overwrite: false },
    );
    expect(refreshGraph).toHaveBeenCalledOnce();

    await action.undo();

    expect(operations.delete).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/workspace/src/app copy.ts' }),
      { recursive: true, useTrash: false },
    );
  });

  it('moves cut files and restores the original path on undo', async () => {
    const action = new PasteClipboardFilesAction(
      snapshot('cut'),
      uri('/workspace'),
      'src',
      refreshGraph,
      operations,
    );

    await action.execute();
    await action.undo();

    expect(operations.rename).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ path: '/workspace/app.ts' }),
      expect.objectContaining({ path: '/workspace/src/app.ts' }),
      { overwrite: false },
    );
    expect(operations.rename).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ path: '/workspace/src/app.ts' }),
      expect.objectContaining({ path: '/workspace/app.ts' }),
      { overwrite: false },
    );
  });

  it('rolls back completed copies when a later copy fails', async () => {
    vi.mocked(operations.copy)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('copy failed'));
    const action = new PasteClipboardFilesAction(
      snapshot('copy', ['a.ts', 'b.ts']),
      uri('/workspace'),
      'src',
      refreshGraph,
      operations,
    );

    await expect(action.execute()).rejects.toThrow('copy failed');

    expect(operations.delete).toHaveBeenCalledOnce();
    expect(operations.delete).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/workspace/src/a.ts' }),
      { recursive: true, useTrash: false },
    );
    expect(refreshGraph).toHaveBeenCalledOnce();
  });

  it('removes a cross-workspace cut copy when deleting its source fails', async () => {
    vi.mocked(operations.delete)
      .mockRejectedValueOnce(new Error('source delete failed'))
      .mockResolvedValueOnce(undefined);
    const action = new PasteClipboardFilesAction(
      snapshot('cut'),
      uri('/other-workspace'),
      'dest',
      refreshGraph,
      operations,
    );

    await expect(action.execute()).rejects.toThrow('source delete failed');

    expect(operations.delete).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ path: '/other-workspace/dest/app.ts' }),
      { recursive: true, useTrash: false },
    );
    expect(refreshGraph).toHaveBeenCalledOnce();
  });

  it('rejects redo when the planned destination became occupied', async () => {
    const action = new PasteClipboardFilesAction(
      snapshot('copy'),
      uri('/workspace'),
      'src',
      refreshGraph,
      operations,
    );
    await action.execute();
    await action.undo();
    vi.mocked(operations.stat).mockResolvedValue({} as vscode.FileStat);

    await expect(action.execute()).rejects.toThrow(
      'A file or folder **app.ts** already exists at this location. Please choose a different name.',
    );
  });

  it('drops descendants when their selected parent is already copied', async () => {
    const action = new PasteClipboardFilesAction(
      snapshot('copy', ['src', 'src/app.ts']),
      uri('/workspace'),
      'dest',
      refreshGraph,
      operations,
    );

    await action.execute();

    expect(operations.copy).toHaveBeenCalledOnce();
    expect(operations.copy).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/workspace/src' }),
      expect.objectContaining({ path: '/workspace/dest/src' }),
      { overwrite: false },
    );
  });

  it('rejects a paste into a selected folder descendant', async () => {
    const action = new PasteClipboardFilesAction(
      snapshot('copy', ['src']),
      uri('/workspace'),
      'src/nested',
      refreshGraph,
      operations,
    );

    await expect(action.execute()).rejects.toThrow(
      'Cannot paste a folder into itself or one of its descendants.',
    );
    expect(operations.copy).not.toHaveBeenCalled();
  });
});
