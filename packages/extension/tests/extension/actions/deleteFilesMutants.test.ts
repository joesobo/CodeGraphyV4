/**
 * @fileoverview Additional tests for DeleteFilesAction targeting surviving mutants.
 *
 * Surviving mutants:
 * - L26,28,30 ArrayDeclaration: initial _storedFiles/_favoritesBefore/_favoritesAfter = []
 * - L54:54 StringLiteral: config section 'codegraphy'
 * - L55:67 ArrayDeclaration: default [] in config.get('favorites', [])
 * - L68:23 BlockStatement: catch body emptied (console.error skipped)
 * - L69:23, L87:23 StringLiteral: template literals for error messages
 * - L93:54 StringLiteral: config section 'codegraphy' in undo
 */

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

describe('DeleteFilesAction (mutant coverage)', () => {
  const mockWorkspaceFolder = { fsPath: '/workspace' } as vscode.Uri;
  let mockRefreshGraph: ReturnType<typeof vi.fn>;
  let mockConfigGet: ReturnType<typeof vi.fn>;
  let mockConfigUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshGraph = vi.fn().mockResolvedValue(undefined);
    mockConfigGet = vi.fn().mockReturnValue([]);
    mockConfigUpdate = vi.fn().mockResolvedValue(undefined);

    vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(
      new Uint8Array([72, 101, 108, 108, 111])
    );
    vi.mocked(vscode.workspace.fs.delete).mockResolvedValue(undefined);
    vi.mocked(vscode.workspace.fs.writeFile).mockResolvedValue(undefined);

    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: mockConfigGet,
      update: mockConfigUpdate,
    } as unknown as vscode.WorkspaceConfiguration);
  });

  describe('config section string', () => {
    it('calls getConfiguration with codegraphy during execute', async () => {
      const action = new DeleteFilesAction(['file.ts'], mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();

      expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('codegraphy');
    });

    it('calls getConfiguration with codegraphy during undo', async () => {
      const action = new DeleteFilesAction(['file.ts'], mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();
      vi.mocked(vscode.workspace.getConfiguration).mockClear();
      vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
        get: mockConfigGet,
        update: mockConfigUpdate,
      } as unknown as vscode.WorkspaceConfiguration);

      await action.undo();

      expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('codegraphy');
    });
  });

  describe('config get key and default value', () => {
    it('reads the favorites key with an empty array default', async () => {
      const action = new DeleteFilesAction(['file.ts'], mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();

      expect(mockConfigGet).toHaveBeenCalledWith('favorites', []);
    });
  });

  describe('config update key', () => {
    it('updates the favorites config key during execute', async () => {
      const action = new DeleteFilesAction(['file.ts'], mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();

      expect(mockConfigUpdate).toHaveBeenCalledWith(
        'favorites',
        expect.any(Array),
      );
    });

    it('updates the favorites config key during undo', async () => {
      const action = new DeleteFilesAction(['file.ts'], mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();
      mockConfigUpdate.mockClear();
      await action.undo();

      expect(mockConfigUpdate).toHaveBeenCalledWith(
        'favorites',
        expect.any(Array),
      );
    });
  });

  describe('initial state arrays are empty', () => {
    it('undo restores an empty favorites list when favorites were originally empty', async () => {
      mockConfigGet.mockReturnValue([]);
      const action = new DeleteFilesAction(['file.ts'], mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();
      await action.undo();

      // The last config update call (in undo) should restore empty favorites
      const undoCall = mockConfigUpdate.mock.calls[mockConfigUpdate.mock.calls.length - 1];
      expect(undoCall[1]).toEqual([]);
    });

    it('undo without prior execute restores empty stored files list', async () => {
      const action = new DeleteFilesAction(['file.ts'], mockWorkspaceFolder, mockRefreshGraph);

      // Undo without execute: _storedFiles should be [] so no writeFile calls happen
      await action.undo();

      expect(vscode.workspace.fs.writeFile).not.toHaveBeenCalled();
    });

    it('undo without prior execute uses empty favoritesBefore', async () => {
      const action = new DeleteFilesAction(['file.ts'], mockWorkspaceFolder, mockRefreshGraph);

      // Undo without execute: _favoritesBefore should be [] (empty default)
      await action.undo();

      expect(mockConfigUpdate).toHaveBeenCalledWith(
        'favorites',
        [],
      );
    });

    it('execute stores empty favoritesAfter when no favorites match deleted paths', async () => {
      mockConfigGet.mockReturnValue([]);
      const action = new DeleteFilesAction(['file.ts'], mockWorkspaceFolder, mockRefreshGraph);

      await action.execute();

      // favoritesAfter should be [] since original favorites were empty
      expect(mockConfigUpdate).toHaveBeenCalledWith(
        'favorites',
        [],
      );
    });
  });

  describe('error handling in execute catch block', () => {
    it('logs an error message with the failing file path when readFile throws', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('read failure');
      vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(error);

      const action = new DeleteFilesAction(
        ['broken.ts'],
        mockWorkspaceFolder,
        mockRefreshGraph
      );

      await action.execute();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[CodeGraphy] Failed to delete broken.ts:',
        error
      );
      consoleSpy.mockRestore();
    });

    it('includes the specific file path in the execute error log', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(new Error('fail'));

      const action = new DeleteFilesAction(
        ['src/deep/nested/file.ts'],
        mockWorkspaceFolder,
        mockRefreshGraph
      );

      await action.execute();

      const logCall = consoleSpy.mock.calls[0];
      expect(logCall[0]).toContain('src/deep/nested/file.ts');
      consoleSpy.mockRestore();
    });

    it('continues processing remaining files after a failure', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(vscode.workspace.fs.readFile)
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce(new Uint8Array([1, 2, 3]));

      const action = new DeleteFilesAction(
        ['fail.ts', 'success.ts'],
        mockWorkspaceFolder,
        mockRefreshGraph
      );

      await action.execute();

      // The second file should still be deleted
      expect(vscode.workspace.fs.delete).toHaveBeenCalledTimes(1);
      expect(vscode.workspace.fs.delete).toHaveBeenCalledWith(
        expect.objectContaining({ fsPath: '/workspace/success.ts' }),
        { useTrash: true }
      );

      vi.mocked(console.error).mockRestore?.();
    });
  });

  describe('error handling in undo catch block', () => {
    it('logs an error message with the file path when writeFile fails during undo', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const action = new DeleteFilesAction(
        ['restore-fail.ts'],
        mockWorkspaceFolder,
        mockRefreshGraph
      );

      await action.execute();
      consoleSpy.mockClear();

      const writeError = new Error('write error');
      vi.mocked(vscode.workspace.fs.writeFile).mockRejectedValueOnce(writeError);

      await action.undo();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[CodeGraphy] Failed to restore restore-fail.ts:',
        writeError
      );
      consoleSpy.mockRestore();
    });

    it('shows an error notification with the file path when undo restore fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const action = new DeleteFilesAction(
        ['notify-fail.ts'],
        mockWorkspaceFolder,
        mockRefreshGraph
      );

      await action.execute();
      vi.mocked(vscode.workspace.fs.writeFile).mockRejectedValueOnce(new Error('fail'));

      await action.undo();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Failed to restore notify-fail.ts'
      );
      vi.mocked(console.error).mockRestore?.();
    });
  });

  describe('favoritesAfter calculation', () => {
    it('removes deleted file paths from the favorites list', async () => {
      mockConfigGet.mockReturnValue(['keep.ts', 'delete-me.ts', 'also-keep.ts']);

      const action = new DeleteFilesAction(
        ['delete-me.ts'],
        mockWorkspaceFolder,
        mockRefreshGraph
      );

      await action.execute();

      expect(mockConfigUpdate).toHaveBeenCalledWith(
        'favorites',
        ['keep.ts', 'also-keep.ts'],
      );
    });
  });
});
