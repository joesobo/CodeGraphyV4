import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { CreateFolderAction } from '../../../src/extension/actions/createFolder';

vi.mock('vscode', () => ({
  workspace: {
    fs: {
      createDirectory: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      readDirectory: vi.fn().mockResolvedValue([]),
      stat: vi.fn().mockResolvedValue({}),
    },
  },
  Uri: {
    joinPath: vi.fn((base: { fsPath: string }, ...pathSegments: string[]) => ({
      fsPath: `${base.fsPath}/${pathSegments.join('/')}`,
      toString: () => `file://${base.fsPath}/${pathSegments.join('/')}`,
    })),
  },
  FileType: {
    File: 1,
  },
}));

describe('CreateFolderAction', () => {
  const mockWorkspaceFolder = { fsPath: '/workspace' } as vscode.Uri;
  let mockRefreshGraph: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshGraph = vi.fn().mockResolvedValue(undefined);
    vi.mocked(vscode.workspace.fs.readDirectory).mockResolvedValue([]);
  });

  it('uses the folder name in the description', () => {
    const action = new CreateFolderAction('src/components', mockWorkspaceFolder, mockRefreshGraph);

    expect(action.description).toBe('Create folder: components');
  });

  it('creates the folder and refreshes graph data', async () => {
    const action = new CreateFolderAction('src/components', mockWorkspaceFolder, mockRefreshGraph);

    await action.execute();

    expect(vscode.Uri.joinPath).toHaveBeenCalledWith(mockWorkspaceFolder, 'src/components');
    expect(vscode.workspace.fs.createDirectory).toHaveBeenCalledWith(
      expect.objectContaining({ fsPath: '/workspace/src/components' }),
    );
    expect(mockRefreshGraph).toHaveBeenCalledOnce();
  });

  it.each([
    ['short root path', 'a', '/workspace/a'],
    ['single nested path', 'src/core', '/workspace/src/core'],
    ['deep nested path', 'src/features/generated/deep', '/workspace/src/features/generated/deep'],
    [
      'long valid path',
      `${'generated-'.repeat(12)}folder/${'slice-'.repeat(12)}area`,
      `/workspace/${'generated-'.repeat(12)}folder/${'slice-'.repeat(12)}area`,
    ],
    ['dotfolder path', 'src/.storybook', '/workspace/src/.storybook'],
    ['path with spaces', 'src/new menu/items [draft]', '/workspace/src/new menu/items [draft]'],
  ])('creates a folder for a %s', async (_label, folderPath, expectedFolderFsPath) => {
    vi.mocked(vscode.workspace.fs.stat).mockRejectedValue(new Error('missing'));
    const action = new CreateFolderAction(folderPath, mockWorkspaceFolder, mockRefreshGraph);

    await action.execute();

    expect(vscode.workspace.fs.createDirectory).toHaveBeenCalledWith(
      expect.objectContaining({ fsPath: expectedFolderFsPath }),
    );
    expect(mockRefreshGraph).toHaveBeenCalledOnce();
  });

  it.each([
    '',
    '   ',
    '../outside',
    'src/../outside',
    '/absolute',
    'C:/outside',
    'C:',
    'src//core',
    'src/core/',
    './core',
    'src/./core',
    'nested\\folder',
    'src/\u0000core',
    'src/\ncore',
  ])('rejects unsafe workspace-relative folder paths before mutating the filesystem: %j', async (folderPath) => {
    const action = new CreateFolderAction(folderPath, mockWorkspaceFolder, mockRefreshGraph);

    await expect(action.execute()).rejects.toThrow(
      'Enter a relative folder path inside the workspace.',
    );

    expect(vscode.workspace.fs.stat).not.toHaveBeenCalled();
    expect(vscode.workspace.fs.createDirectory).not.toHaveBeenCalled();
    expect(mockRefreshGraph).not.toHaveBeenCalled();
  });

  it('removes created parent directories when undoing a nested folder create', async () => {
    vi.mocked(vscode.workspace.fs.stat).mockImplementation(async (uri: vscode.Uri) => {
      if (uri.fsPath === '/workspace/test') {
        return {} as vscode.FileStat;
      }

      throw new Error('missing');
    });
    const action = new CreateFolderAction('test/a/b/c', mockWorkspaceFolder, mockRefreshGraph);

    await action.execute();
    vi.mocked(vscode.workspace.fs.delete).mockClear();
    mockRefreshGraph.mockClear();

    await action.undo();

    expect(vscode.workspace.fs.delete).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ fsPath: '/workspace/test/a/b/c' }),
      { recursive: false, useTrash: true },
    );
    expect(vscode.workspace.fs.delete).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ fsPath: '/workspace/test/a/b' }),
      { recursive: false, useTrash: true },
    );
    expect(vscode.workspace.fs.delete).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ fsPath: '/workspace/test/a' }),
      { recursive: false, useTrash: true },
    );
    expect(vscode.workspace.fs.delete).toHaveBeenCalledTimes(3);
    expect(mockRefreshGraph).toHaveBeenCalledOnce();
  });

  it('uses normalized created folder paths when undoing a whitespace-padded nested folder create', async () => {
    vi.mocked(vscode.workspace.fs.stat).mockImplementation(async (uri: vscode.Uri) => {
      if (uri.fsPath === '/workspace/src') {
        return {} as vscode.FileStat;
      }

      throw new Error('missing');
    });
    const action = new CreateFolderAction(
      '  src/features/generated  ',
      mockWorkspaceFolder,
      mockRefreshGraph,
    );

    await action.execute();
    vi.mocked(vscode.workspace.fs.delete).mockClear();
    mockRefreshGraph.mockClear();

    await action.undo();

    expect(vscode.workspace.fs.delete).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ fsPath: '/workspace/src/features/generated' }),
      { recursive: false, useTrash: true },
    );
    expect(vscode.workspace.fs.delete).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ fsPath: '/workspace/src/features' }),
      { recursive: false, useTrash: true },
    );
    expect(vscode.workspace.fs.delete).toHaveBeenCalledTimes(2);
    expect(mockRefreshGraph).toHaveBeenCalledOnce();
  });

  it('uses the normalized folder path for simple folder undo fallback', async () => {
    const action = new CreateFolderAction(
      '  src/components  ',
      mockWorkspaceFolder,
      mockRefreshGraph,
    );

    await action.execute();
    vi.mocked(vscode.workspace.fs.delete).mockClear();
    mockRefreshGraph.mockClear();

    await action.undo();

    expect(vscode.workspace.fs.readDirectory).toHaveBeenCalledWith(
      expect.objectContaining({ fsPath: '/workspace/src/components' }),
    );
    expect(vscode.workspace.fs.delete).toHaveBeenCalledWith(
      expect.objectContaining({ fsPath: '/workspace/src/components' }),
      { recursive: false, useTrash: true },
    );
    expect(mockRefreshGraph).toHaveBeenCalledOnce();
  });

  it('moves an empty created folder to trash on undo', async () => {
    const action = new CreateFolderAction('src/components', mockWorkspaceFolder, mockRefreshGraph);

    await action.undo();

    expect(vscode.workspace.fs.readDirectory).toHaveBeenCalledWith(
      expect.objectContaining({ fsPath: '/workspace/src/components' }),
    );
    expect(vscode.workspace.fs.delete).toHaveBeenCalledWith(
      expect.objectContaining({ fsPath: '/workspace/src/components' }),
      { recursive: false, useTrash: true },
    );
    expect(mockRefreshGraph).toHaveBeenCalledOnce();
  });

  it('does not remove a created folder that now contains files', async () => {
    vi.mocked(vscode.workspace.fs.readDirectory).mockResolvedValue([
      ['later.ts', vscode.FileType.File],
    ]);
    const action = new CreateFolderAction('src/components', mockWorkspaceFolder, mockRefreshGraph);

    await action.undo();

    expect(vscode.workspace.fs.delete).not.toHaveBeenCalled();
    expect(mockRefreshGraph).not.toHaveBeenCalled();
  });
});
