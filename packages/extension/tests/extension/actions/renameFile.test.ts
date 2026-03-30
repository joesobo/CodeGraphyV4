import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { RenameFileAction } from '../../../src/extension/actions/renameFile';

vi.mock('vscode', () => ({
  workspace: {
    fs: {
      rename: vi.fn().mockResolvedValue(undefined),
    },
    getConfiguration: vi.fn(),
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

describe('RenameFileAction', () => {
  const mockWorkspaceFolder = { fsPath: '/workspace' } as vscode.Uri;
  let mockRefreshGraph: ReturnType<typeof vi.fn>;
  let mockConfigUpdate: ReturnType<typeof vi.fn>;
  let currentFavorites: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshGraph = vi.fn().mockResolvedValue(undefined);
    currentFavorites = [];
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
    it('shows old and new filenames', () => {
      const action = new RenameFileAction('src/old.ts', 'src/new.ts', mockWorkspaceFolder, mockRefreshGraph);
      expect(action.description).toContain('old.ts');
      expect(action.description).toContain('new.ts');
    });

    it('extracts filenames from deep paths', () => {
      const action = new RenameFileAction('a/b/c/old.ts', 'x/y/z/new.ts', mockWorkspaceFolder, mockRefreshGraph);
      expect(action.description).toBe('Rename: old.ts \u2192 new.ts');
    });
  });

  describe('execute', () => {
    it('renames the file from old path to new path', async () => {
      const action = new RenameFileAction('src/old.ts', 'src/new.ts', mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();

      expect(vscode.workspace.fs.rename).toHaveBeenCalledWith(
        expect.objectContaining({ fsPath: '/workspace/src/old.ts' }),
        expect.objectContaining({ fsPath: '/workspace/src/new.ts' })
      );
    });

    it('updates favorites when renaming a favorited file', async () => {
      currentFavorites = ['src/old.ts', 'src/other.ts'];

      const action = new RenameFileAction('src/old.ts', 'src/new.ts', mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();

      expect(mockConfigUpdate).toHaveBeenCalledWith(
        'favorites',
        ['src/new.ts', 'src/other.ts'],
        vscode.ConfigurationTarget.Workspace
      );
    });

    it('does not update favorites when renaming a non-favorited file', async () => {
      currentFavorites = ['src/other.ts'];

      const action = new RenameFileAction('src/old.ts', 'src/new.ts', mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();

      expect(mockConfigUpdate).not.toHaveBeenCalled();
    });

    it('calls refreshGraph after rename', async () => {
      const action = new RenameFileAction('src/old.ts', 'src/new.ts', mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();

      expect(mockRefreshGraph).toHaveBeenCalledOnce();
    });

    it('captures before state only on first execution', async () => {
      currentFavorites = ['src/old.ts'];

      const action = new RenameFileAction('src/old.ts', 'src/new.ts', mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();

      // Simulate external modification of favorites
      currentFavorites = ['src/new.ts', 'src/extra.ts'];

      // Re-execute (redo) should use the originally calculated after state
      await action.execute();

      // Both calls should use the same favoritesAfter
      const firstCallArg = mockConfigUpdate.mock.calls[0][1];
      const secondCallArg = mockConfigUpdate.mock.calls[1][1];
      expect(secondCallArg).toEqual(firstCallArg);
    });

    it('preserves other favorites when updating', async () => {
      currentFavorites = ['src/keep1.ts', 'src/old.ts', 'src/keep2.ts'];

      const action = new RenameFileAction('src/old.ts', 'src/new.ts', mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();

      expect(mockConfigUpdate).toHaveBeenCalledWith(
        'favorites',
        ['src/keep1.ts', 'src/new.ts', 'src/keep2.ts'],
        vscode.ConfigurationTarget.Workspace
      );
    });
  });

  describe('undo', () => {
    it('reverses the rename from new path back to old path', async () => {
      const action = new RenameFileAction('src/old.ts', 'src/new.ts', mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();
      vi.mocked(vscode.workspace.fs.rename).mockClear();
      await action.undo();

      expect(vscode.workspace.fs.rename).toHaveBeenCalledWith(
        expect.objectContaining({ fsPath: '/workspace/src/new.ts' }),
        expect.objectContaining({ fsPath: '/workspace/src/old.ts' })
      );
    });

    it('restores favorites to the state before execute', async () => {
      currentFavorites = ['src/old.ts', 'src/other.ts'];

      const action = new RenameFileAction('src/old.ts', 'src/new.ts', mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();
      await action.undo();

      const lastCall = mockConfigUpdate.mock.calls[mockConfigUpdate.mock.calls.length - 1];
      expect(lastCall[1]).toEqual(['src/old.ts', 'src/other.ts']);
    });

    it('does not update favorites on undo when the file was not favorited', async () => {
      currentFavorites = ['src/other.ts'];

      const action = new RenameFileAction('src/old.ts', 'src/new.ts', mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();
      mockConfigUpdate.mockClear();
      await action.undo();

      expect(mockConfigUpdate).not.toHaveBeenCalled();
    });

    it('calls refreshGraph after undo', async () => {
      const action = new RenameFileAction('src/old.ts', 'src/new.ts', mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();
      mockRefreshGraph.mockClear();
      await action.undo();

      expect(mockRefreshGraph).toHaveBeenCalledOnce();
    });
  });
});
