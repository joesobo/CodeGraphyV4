import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { DeleteFilesAction } from '../../../src/extension/actions/deleteFiles';

vi.mock('vscode', () => ({
  workspace: {
    fs: {
      readFile: vi.fn(),
      writeFile: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    getConfiguration: vi.fn(),
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
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  },
}));

describe('DeleteFilesAction', () => {
  const mockWorkspaceFolder = { fsPath: '/workspace' } as vscode.Uri;
  let mockRefreshGraph: ReturnType<typeof vi.fn>;
  let mockConfigUpdate: ReturnType<typeof vi.fn>;
  let currentFavorites: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshGraph = vi.fn().mockResolvedValue(undefined);
    currentFavorites = [];

    vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(
      new Uint8Array([72, 101, 108, 108, 111])
    );
    vi.mocked(vscode.workspace.fs.delete).mockResolvedValue(undefined);
    vi.mocked(vscode.workspace.fs.writeFile).mockResolvedValue(undefined);

    mockConfigUpdate = vi.fn().mockResolvedValue(undefined);
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((key: string, defaultValue: unknown) => {
        if (key === 'favorites') return [...currentFavorites];
        return defaultValue;
      }),
      update: mockConfigUpdate,
    } as unknown as vscode.WorkspaceConfiguration);
  });

  describe('description', () => {
    it('describes a single file deletion using the filename', () => {
      const action = new DeleteFilesAction(['src/utils/helper.ts'], mockWorkspaceFolder, mockRefreshGraph);
      expect(action.description).toBe('Delete: helper.ts');
    });

    it('describes multiple file deletions with a count', () => {
      const action = new DeleteFilesAction(['a.ts', 'b.ts', 'c.ts'], mockWorkspaceFolder, mockRefreshGraph);
      expect(action.description).toBe('Delete 3 files');
    });

    it('describes two file deletions with a count', () => {
      const action = new DeleteFilesAction(['a.ts', 'b.ts'], mockWorkspaceFolder, mockRefreshGraph);
      expect(action.description).toBe('Delete 2 files');
    });
  });

  describe('execute', () => {
    it('reads file contents before deletion for backup', async () => {
      const action = new DeleteFilesAction(['src/app.ts'], mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();

      expect(vscode.workspace.fs.readFile).toHaveBeenCalledOnce();
      expect(vscode.workspace.fs.delete).toHaveBeenCalledWith(
        expect.objectContaining({ fsPath: '/workspace/src/app.ts' }),
        { useTrash: true }
      );
    });

    it('handles multiple files', async () => {
      const action = new DeleteFilesAction(
        ['src/a.ts', 'src/b.ts', 'src/c.ts'],
        mockWorkspaceFolder,
        mockRefreshGraph
      );

      await action.execute();

      expect(vscode.workspace.fs.readFile).toHaveBeenCalledTimes(3);
      expect(vscode.workspace.fs.delete).toHaveBeenCalledTimes(3);
    });

    it('continues with other files when one read fails', async () => {
      vi.mocked(vscode.workspace.fs.readFile)
        .mockRejectedValueOnce(new Error('not found'))
        .mockResolvedValueOnce(new Uint8Array([1, 2, 3]));

      const action = new DeleteFilesAction(
        ['missing.ts', 'exists.ts'],
        mockWorkspaceFolder,
        mockRefreshGraph
      );

      await action.execute();

      // Should still refresh graph even if one file failed
      expect(mockRefreshGraph).toHaveBeenCalledOnce();
    });

    it('removes deleted files from favorites', async () => {
      currentFavorites = ['src/app.ts', 'src/other.ts'];

      const action = new DeleteFilesAction(['src/app.ts'], mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();

      expect(mockConfigUpdate).toHaveBeenCalledWith(
        'favorites',
        ['src/other.ts'],
        undefined,
      );
    });

    it('does not change favorites when deleted files are not favorites', async () => {
      currentFavorites = ['src/other.ts'];

      const action = new DeleteFilesAction(['src/app.ts'], mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();

      // Still updates config with the same favorites list
      expect(mockConfigUpdate).toHaveBeenCalledWith(
        'favorites',
        ['src/other.ts'],
        undefined,
      );
    });

    it('stores favorites state before deletion', async () => {
      currentFavorites = ['src/app.ts', 'src/keep.ts'];

      const action = new DeleteFilesAction(['src/app.ts'], mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();
      await action.undo();

      // Undo should restore the original favorites
      const lastUpdateCall = mockConfigUpdate.mock.calls[mockConfigUpdate.mock.calls.length - 1];
      expect(lastUpdateCall[1]).toEqual(['src/app.ts', 'src/keep.ts']);
    });

    it('calls refreshGraph after deletion', async () => {
      const action = new DeleteFilesAction(['app.ts'], mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();

      expect(mockRefreshGraph).toHaveBeenCalledOnce();
    });
  });

  describe('undo', () => {
    it('restores file contents from backup', async () => {
      const fileContent = new Uint8Array([72, 101, 108, 108, 111]);
      vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(fileContent);

      const action = new DeleteFilesAction(['src/app.ts'], mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();
      await action.undo();

      expect(vscode.workspace.fs.writeFile).toHaveBeenCalledWith(
        expect.objectContaining({ fsPath: '/workspace/src/app.ts' }),
        fileContent
      );
    });

    it('restores favorites to the state before execute', async () => {
      currentFavorites = ['src/app.ts', 'src/other.ts'];

      const action = new DeleteFilesAction(['src/app.ts'], mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();
      await action.undo();

      const lastCall = mockConfigUpdate.mock.calls[mockConfigUpdate.mock.calls.length - 1];
      expect(lastCall[0]).toBe('favorites');
      expect(lastCall[1]).toEqual(['src/app.ts', 'src/other.ts']);
    });

    it('shows error message when file restoration fails', async () => {
      const action = new DeleteFilesAction(['src/app.ts'], mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();

      vi.mocked(vscode.workspace.fs.writeFile).mockRejectedValueOnce(new Error('write error'));

      await action.undo();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Failed to restore src/app.ts'
      );
    });

    it('calls refreshGraph after restoration', async () => {
      const action = new DeleteFilesAction(['app.ts'], mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();
      mockRefreshGraph.mockClear();
      await action.undo();

      expect(mockRefreshGraph).toHaveBeenCalledOnce();
    });

    it('restores multiple files', async () => {
      const action = new DeleteFilesAction(
        ['src/a.ts', 'src/b.ts'],
        mockWorkspaceFolder,
        mockRefreshGraph
      );

      await action.execute();
      await action.undo();

      expect(vscode.workspace.fs.writeFile).toHaveBeenCalledTimes(2);
    });
  });
});
